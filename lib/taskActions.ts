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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserData, TaskData } from '@/types';
import { buildTaskData, taskDataToFirestore } from '@/lib/taskUtils';

/**
 * タスクを承認し、報酬を付与する（Transaction版 - 競合防御）
 * 5つのガードを順番に実行し、すべてパスした場合のみ承認を実行
 *
 * Transaction化の効果:
 * - 親が二人いる家庭で同時に「承認」を押しても、報酬の二重加算を物理的に防ぐ
 * - 読み取った瞬間から書き込むまで、データが他人に触れられていないことをFirestoreが保証
 *
 * @param taskId - タスクID
 * @param currentUser - 現在のユーザー情報
 * @throws Error - ガードに引っかかった場合、またはDB操作に失敗した場合
 */
export async function approveTask(
  taskId: string,
  currentUser: UserData
): Promise<void> {
  // ガード0: 親ユーザーであることを確認
  if (currentUser.role !== 'parent') {
    throw new Error('タスクの承認は親のみが実行できます');
  }

  // ガード0.5: familyIdが存在することを確認
  if (!currentUser.familyId) {
    throw new Error('家族IDが設定されていません');
  }

  const taskRef = doc(db, 'tasks', taskId);

  // Transaction で競合を防御
  try {
    await runTransaction(db, async (transaction) => {
      // 1. データ取得（Transaction内で読み取り）
      const taskSnap = await transaction.get(taskRef);

      // ガード1: 実在チェック
      if (!taskSnap.exists()) {
        throw new Error('タスクが存在しません');
      }

      // ガード1.5: Transaction内での生データ直接チェック（最重要）
      // 理由: buildTaskData を通す前に、Firestoreの生データで現在のステータスを確認
      // 効果: 100万分の1秒の差で発生する「二重報酬加算」を物理的にゼロにする
      const rawData = taskSnap.data();
      const currentStatus = rawData?.status;

      // 既に承認済みなら即座に中断（abort）
      if (currentStatus === 'approved') {
        throw new Error('既に承認済みです');
      }

      // 完了報告前なら即座に中断（abort）
      if (currentStatus !== 'completed') {
        throw new Error('承認可能な状態ではありません（完了報告が必要です）');
      }

      // 2. 憲法遵守：camelCaseへの変換
      let task: TaskData;
      try {
        task = buildTaskData(rawData, taskSnap.id);
      } catch (error) {
        throw new Error('タスクデータの変換に失敗しました');
      }

      // ガード2: 家族チェック
      if (task.familyId !== currentUser.familyId) {
        throw new Error('権限がありません（別の家族のタスクです）');
      }

      // ガード3: 状態チェック（二重加算防止）- 念のため再確認
      if (task.status !== 'completed') {
        throw new Error('承認可能な状態ではありません（完了報告が必要です）');
      }

      // ガード4: 担当者チェック
      if (!task.assignedTo) {
        throw new Error('担当者が設定されていません');
      }

      // ガード5: 報酬チェック
      if (task.rewardPoints <= 0) {
        throw new Error('報酬ポイントが不正です');
      }

      // 3. アトミック更新（taskDataToFirestoreを使用してsnake_caseに変換）
      const userRef = doc(db, 'users', task.assignedTo);

      // タスクのステータスを承認済みに更新（憲法遵守：snake_case）
      const taskUpdate = taskDataToFirestore({
        status: 'approved',
        approvedAt: new Date(), // serverTimestampの代わりにDateを使用
      });
      
      // serverTimestampは直接指定
      transaction.update(taskRef, {
        ...taskUpdate,
        approved_at: serverTimestamp(),
      });

      // ユーザーの報酬を加算（憲法遵守：snake_case）
      transaction.update(userRef, {
        total_reward: increment(task.rewardPoints),
      });

      // Transaction は自動的にコミットされる
    });
  } catch (error) {
    console.error('タスク承認のTransaction エラー:', error);
    if (error instanceof Error) {
      throw error; // ガードエラーはそのまま再スロー
    }
    throw new Error('タスクの承認に失敗しました（Transaction エラー）');
  }
}

/**
 * タスクを完了状態にする（子供が実行）- Transaction版
 *
 * Transaction化の効果:
 * - 担当者が空のタスクを二人の子供が同時に完了させた際の競合防止
 * - assigned_to の不変性保証（status が completed 以降は変更不可）
 *
 * @param taskId - タスクID
 * @param currentUser - 現在のユーザー情報
 * @throws Error - ガードに引っかかった場合、またはDB操作に失敗した場合
 */
export async function completeTask(
  taskId: string,
  currentUser: UserData
): Promise<void> {
  // ガード0: 子供ユーザーであることを確認
  if (currentUser.role !== 'child') {
    throw new Error('タスクの完了報告は子供のみが実行できます');
  }

  // ガード0.5: familyIdが存在することを確認
  if (!currentUser.familyId) {
    throw new Error('家族IDが設定されていません');
  }

  const taskRef = doc(db, 'tasks', taskId);

  // Transaction で競合を防御
  try {
    await runTransaction(db, async (transaction) => {
      // 1. データ取得（Transaction内で読み取り）
      const taskSnap = await transaction.get(taskRef);

      // ガード1: 実在チェック
      if (!taskSnap.exists()) {
        throw new Error('タスクが存在しません');
      }

      // ガード1.5: Transaction内での生データ直接チェック（最重要）
      // 理由: 二人の子供が同時に完了させた際、先に完了した方の assigned_to を守る
      const rawData = taskSnap.data();
      const currentStatus = rawData?.status;
      const currentAssignedTo = rawData?.assigned_to;

      // 既に完了済みなら即座に中断（abort）
      if (currentStatus === 'completed' || currentStatus === 'approved') {
        throw new Error('既に完了済みです');
      }

      // pending 以外なら即座に中断（abort）
      if (currentStatus !== 'pending') {
        throw new Error('完了報告可能な状態ではありません');
      }

      // 2. 憲法遵守：camelCaseへの変換
      let task: TaskData;
      try {
        task = buildTaskData(rawData, taskSnap.id);
      } catch (error) {
        throw new Error('タスクデータの変換に失敗しました');
      }

      // ガード2: 家族チェック
      if (task.familyId !== currentUser.familyId) {
        throw new Error('権限がありません（別の家族のタスクです）');
      }

      // ガード3: 状態チェック（念のため再確認）
      if (task.status !== 'pending') {
        throw new Error('完了報告可能な状態ではありません');
      }

      // ガード4: 担当者チェック（厳格化：手柄の横取り防止）
      if (currentAssignedTo) {
        // 既に担当者が設定されている場合、本人のみが完了報告可能
        if (currentAssignedTo !== currentUser.userId) {
          throw new Error('このタスクは他の人に割り当てられています');
        }
      }

      // 3. アトミック更新
      // assigned_to の不変性保証: 既に設定されている場合は変更しない
      const updateData: any = {
        status: 'completed',
        completed_at: serverTimestamp(),
      };

      // 担当者が未設定の場合のみ設定（先着優先）
      if (!currentAssignedTo) {
        updateData.assigned_to = currentUser.userId;
      }

      transaction.update(taskRef, updateData);

      // Transaction は自動的にコミットされる
    });
  } catch (error) {
    console.error('タスク完了のTransaction エラー:', error);
    if (error instanceof Error) {
      throw error; // ガードエラーはそのまま再スロー
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
  // ガード0: 子供のみ
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

  // pending のみ開始可能
  if (task.status !== 'pending') {
    throw new Error('開始可能な状態ではありません');
  }

  // 担当者が設定済みの場合は本人のみ
  if (task.assignedTo && task.assignedTo !== currentUser.userId) {
    throw new Error('このタスクは他の人に割り当てられています');
  }

  const batch = writeBatch(db);
  batch.update(taskRef, {
    status: 'working',
    // 担当者未設定の場合は自動設定
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
  // ガード0: 親のみ
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

  // completed または working のみ差し戻し可能
  if (task.status !== 'completed' && task.status !== 'working') {
    throw new Error('差し戻し可能な状態ではありません');
  }

  const batch = writeBatch(db);
  batch.update(taskRef, {
    status: 'pending',
  });

  await batch.commit();
}

// Made with Bob