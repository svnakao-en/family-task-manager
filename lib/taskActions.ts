/**
 * タスク関連のアクション関数
 * タスクの承認、完了などの操作を担当
 */

import {
  doc,
  writeBatch,
  serverTimestamp,
  increment,
  getDoc,
  runTransaction,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData, TaskData } from '@/types';
import { buildTaskData, taskDataToFirestore } from '@/lib/taskUtils';

/**
 * タスクを承認し、報酬を付与する（Transaction版 - 競合防御）
 */
export async function approveTask(
  taskId: string,
  currentUser: UserData
): Promise<void> {
  if (currentUser.role !== 'parent') {
    throw new Error('タスクの承認は親のみが実行できます');
  }
  if (!currentUser.familyId) {
    throw new Error('家族IDが設定されていません');
  }

  const taskRef = doc(db, 'tasks', taskId);

  try {
    await runTransaction(db, async (transaction) => {
      const taskSnap = await transaction.get(taskRef);

      if (!taskSnap.exists()) {
        throw new Error('タスクが存在しません');
      }

      const rawData = taskSnap.data();
      const currentStatus = rawData?.status;

      if (currentStatus === 'approved') {
        throw new Error('既に承認済みです');
      }
      if (currentStatus !== 'completed') {
        throw new Error('承認可能な状態ではありません（完了報告が必要です）');
      }

      let task: TaskData;
      try {
        task = buildTaskData(rawData, taskSnap.id);
      } catch (error) {
        throw new Error('タスクデータの変換に失敗しました');
      }

      if (task.familyId !== currentUser.familyId) {
        throw new Error('権限がありません（別の家族のタスクです）');
      }
      if (task.status !== 'completed') {
        throw new Error('承認可能な状態ではありません（完了報告が必要です）');
      }
      if (!task.assignedTo) {
        throw new Error('担当者が設定されていません');
      }
      if (task.rewardPoints <= 0) {
        throw new Error('報酬ポイントが不正です');
      }

      const userRef = doc(db, 'users', task.assignedTo);

      const taskUpdate = taskDataToFirestore({
        status: 'approved',
        approvedAt: new Date(),
      });

      transaction.update(taskRef, {
        ...taskUpdate,
        approved_at: serverTimestamp(),
      });

      transaction.update(userRef, {
        total_reward: increment(task.rewardPoints),
      });
    });
  } catch (error) {
    console.error('タスク承認のTransaction エラー:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('タスクの承認に失敗しました（Transaction エラー）');
  }
}

/**
 * タスクを完了状態にする（子供が実行）- Transaction版
 * working → completed への遷移
 */
export async function completeTask(
  taskId: string,
  currentUser: UserData
): Promise<void> {
  if (currentUser.role !== 'child') {
    throw new Error('タスクの完了報告は子供のみが実行できます');
  }
  if (!currentUser.familyId) {
    throw new Error('家族IDが設定されていません');
  }

  const taskRef = doc(db, 'tasks', taskId);

  try {
    await runTransaction(db, async (transaction) => {
      const taskSnap = await transaction.get(taskRef);

      if (!taskSnap.exists()) {
        throw new Error('タスクが存在しません');
      }

      const rawData = taskSnap.data();
      const currentStatus = rawData?.status;
      const currentAssignedTo = rawData?.assigned_to;

      // 修正: completed/approved は既に完了済み
      if (currentStatus === 'completed' || currentStatus === 'approved') {
        throw new Error('既に完了済みです');
      }

      // 修正: working のみ完了報告可能（pending → working → completed の順序を強制）
      if (currentStatus !== 'working') {
        throw new Error('完了報告可能な状態ではありません（まず「はじめる」を押してください）');
      }

      let task: TaskData;
      try {
        task = buildTaskData(rawData, taskSnap.id);
      } catch (error) {
        throw new Error('タスクデータの変換に失敗しました');
      }

      if (task.familyId !== currentUser.familyId) {
        throw new Error('権限がありません（別の家族のタスクです）');
      }

      // 修正: working のみ完了報告可能
      if (task.status !== 'working') {
        throw new Error('完了報告可能な状態ではありません');
      }

      // 担当者チェック（working時点で assigned_to は確定しているはず）
      if (currentAssignedTo && currentAssignedTo !== currentUser.userId) {
        throw new Error('このタスクは他の人に割り当てられています');
      }

      const updateData: any = {
        status: 'completed',
        completed_at: serverTimestamp(),
      };

      // 念のため担当者が未設定の場合も対応
      if (!currentAssignedTo) {
        updateData.assigned_to = currentUser.userId;
      }

      transaction.update(taskRef, updateData);
    });
  } catch (error) {
    console.error('タスク完了のTransaction エラー:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('タスクの完了報告に失敗しました（Transaction エラー）');
  }
}

/**
 * タスクを作業中にする（子供が使用）
 * pending → working への遷移
 */
export async function startTask(
  taskId: string,
  currentUser: UserData
): Promise<void> {
  if (currentUser.role !== 'child') {
    throw new Error('タスクの開始は子供のみが実行できます');
  }
  if (!currentUser.familyId) {
    throw new Error('家族IDが設定されていません');
  }

  const taskRef = doc(db, 'tasks', taskId);
  const taskSnap = await getDoc(taskRef);

  if (!taskSnap.exists()) {
    throw new Error('タスクが存在しません');
  }

  let task: TaskData;
  try {
    task = buildTaskData(taskSnap.data(), taskSnap.id);
  } catch {
    throw new Error('タスクデータの変換に失敗しました');
  }

  if (task.familyId !== currentUser.familyId) {
    throw new Error('権限がありません');
  }

  if (task.status !== 'pending') {
    throw new Error('開始可能な状態ではありません');
  }

  if (task.assignedTo && task.assignedTo !== currentUser.userId) {
    throw new Error('このタスクは他の人に割り当てられています');
  }

  const batch = writeBatch(db);
  batch.update(taskRef, {
    status: 'working',
    ...(task.assignedTo ? {} : { assigned_to: currentUser.userId }),
  });

  await batch.commit();
}

/**
 * タスクを差し戻す（親が使用）
 * completed または working → pending への遷移
 */
export async function rejectTask(
  taskId: string,
  currentUser: UserData
): Promise<void> {
  if (currentUser.role !== 'parent') {
    throw new Error('差し戻しは親のみが実行できます');
  }
  if (!currentUser.familyId) {
    throw new Error('家族IDが設定されていません');
  }

  const taskRef = doc(db, 'tasks', taskId);
  const taskSnap = await getDoc(taskRef);

  if (!taskSnap.exists()) {
    throw new Error('タスクが存在しません');
  }

  let task: TaskData;
  try {
    task = buildTaskData(taskSnap.data(), taskSnap.id);
  } catch {
    throw new Error('タスクデータの変換に失敗しました');
  }

  if (task.familyId !== currentUser.familyId) {
    throw new Error('権限がありません');
  }

  if (task.status !== 'completed' && task.status !== 'working') {
    throw new Error('差し戻し可能な状態ではありません');
  }

  const batch = writeBatch(db);
  batch.update(taskRef, {
    status: 'pending',
  });

  await batch.commit();
}

/**
 * タスクを物理削除する（親が使用）
 * pending のみ削除可能
 */
export async function deleteTask(
  taskId: string,
  currentUser: UserData
): Promise<void> {
  if (currentUser.role !== 'parent') {
    throw new Error('タスクの削除は親のみが実行できます');
  }
  if (!currentUser.familyId) {
    throw new Error('家族IDが設定されていません');
  }

  const taskRef = doc(db, 'tasks', taskId);
  const taskSnap = await getDoc(taskRef);

  if (!taskSnap.exists()) {
    throw new Error('タスクが存在しません');
  }

  let task: TaskData;
  try {
    task = buildTaskData(taskSnap.data(), taskSnap.id);
  } catch {
    throw new Error('タスクデータの変換に失敗しました');
  }

  if (task.familyId !== currentUser.familyId) {
    throw new Error('権限がありません');
  }

  if (task.status !== 'pending') {
    throw new Error('削除できるのは未着手（pending）のタスクのみです');
  }

  await deleteDoc(taskRef);
}

// Made with Bob