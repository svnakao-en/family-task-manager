"use client";

import { useState } from 'react';
import { TaskData, UserData } from '@/types';
import { useWorldTheme } from '@/hooks/useWorldTheme';
import { ApproveButton } from './ApproveButton';
import { CompleteButton } from './CompleteButton';
import { StartButton } from './StartButton';
import { RejectButton } from './RejectButton';
import { DeleteButton } from './DeleteButton';
import { EditTaskForm } from './EditTaskForm';
import { getStatusLabel, formatDate } from '@/lib/taskUtils';

// ─── Props ────────────────────────────────────────────────────────────────────
interface TaskCardProps {
  task: TaskData;
  currentUser: UserData;
  userNameMap: Map<string, string>;
  onTaskUpdate: () => void;
  onCopy?: (task: TaskData) => void;
  onError?: (error: string) => void;
}

export function TaskCard({
  task,
  currentUser,
  userNameMap,
  onTaskUpdate,
  onCopy,
  onError,
}: TaskCardProps): JSX.Element {
  const { colors, effects, themeConfig } = useWorldTheme();
  const presentation = themeConfig.getTaskPresentation(task);

  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [editHovered, setEditHovered] = useState(false);
  const [copyHovered, setCopyHovered] = useState(false);

  const handleEditSuccess = () => {
    setIsEditing(false);
    onTaskUpdate();
  };

  // ─── カード本体スタイル ───────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: colors.cardBg,
    borderRadius: '8px',
    border: `1px solid ${colors.cardBorder}`,
    transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
    boxShadow: isHovered
      ? effects.enableGlowCardHover
        ? presentation.cardHoverShadow
        : effects.cardHoverShadow
      : '0 0 0 transparent',
    borderColor: isHovered ? colors.cardHoverBorder : colors.cardBorder,
  };

  // ─── ステータスバッジスタイル ─────────────────────────────────────────────
  const badgeStyle: React.CSSProperties = {
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '0.08em',
    borderRadius: '4px',
    backgroundColor: colors.statusBadgeBg,
    border: `1px solid ${colors.statusBadgeBorder}`,
    color: colors.statusBadgeText,
    fontFamily: 'monospace',
  };

  // ─── 管理ボタン共通ベース ─────────────────────────────────────────────────
  const cyberBtnBase: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    fontFamily: 'monospace',
    transition: 'background-color 0.2s, box-shadow 0.2s',
  };

  const editBtnStyle: React.CSSProperties = {
    ...cyberBtnBase,
    borderColor: editHovered ? colors.btnPrimaryBg : colors.cardBorder,
    color: colors.btnPrimaryBg,
    backgroundColor: editHovered ? colors.primarySoft : 'transparent',
    boxShadow: editHovered ? `0 0 8px ${colors.primaryStrong}` : 'none',
  };

  const copyBtnStyle: React.CSSProperties = {
    ...cyberBtnBase,
    borderColor: copyHovered ? colors.subtle : colors.cardBorder,
    color: colors.subtle,
    backgroundColor: 'transparent',
    boxShadow: 'none',
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ─── ヘッダー: スートバッジ / タイトル / ステータス ─────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          gap: '8px',
        }}
      >
        {/* スートマーク */}
        <span
          style={{
            fontSize: '11px',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            color: presentation.glowColor,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            textShadow: effects.enableGlowText ? `0 0 6px ${presentation.glowColor}` : 'none',
          }}
        >
          {presentation.label}
        </span>

        {/* タイトル */}
        <h3
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold',
            color: colors.title,
            flex: 1,
            textAlign: 'left',
          }}
        >
          {task.title}
        </h3>

        {/* ステータスバッジ */}
        <span style={badgeStyle}>
          {getStatusLabel(task.status)}
        </span>
      </div>

      {/* ─── 説明 ─────────────────────────────────────────────────────────── */}
      {task.description && (
        <p
          style={{
            margin: '8px 0',
            fontSize: '14px',
            color: colors.text,
            lineHeight: '1.5',
          }}
        >
          {task.description}
        </p>
      )}

      {/* ─── メタ情報 ─────────────────────────────────────────────────────── */}
      <div
        style={{
          fontSize: '12px',
          marginBottom: '12px',
          fontFamily: 'monospace',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <div>
          <span style={{ color: colors.muted }}>REWARD</span>
          <span style={{ color: colors.subtle, marginLeft: '8px' }}>
            {task.rewardPoints} pt
          </span>
        </div>
        <div>
          <span style={{ color: colors.muted }}>CREATED</span>
          <span style={{ color: colors.subtle, marginLeft: '8px' }}>
            {formatDate(task.createdAt)}
          </span>
        </div>
        {task.assignedTo && (
          <div>
            <span style={{ color: colors.muted }}>PLAYER</span>
            <span style={{ color: colors.subtle, marginLeft: '8px' }}>
              {task.assignedTo === currentUser.userId
                ? 'あなた'
                : (userNameMap.get(task.assignedTo) ?? task.assignedTo)}
            </span>
          </div>
        )}
        {task.completedAt && (
          <div>
            <span style={{ color: colors.muted }}>CLEARED</span>
            <span style={{ color: colors.subtle, marginLeft: '8px' }}>
              {formatDate(task.completedAt)}
            </span>
          </div>
        )}
        {task.approvedAt && (
          <div>
            <span style={{ color: colors.muted }}>APPROVED</span>
            <span style={{ color: colors.subtle, marginLeft: '8px' }}>
              {formatDate(task.approvedAt)}
            </span>
          </div>
        )}
      </div>

      {/* ─── インライン編集フォーム ───────────────────────────────────────── */}
      {isEditing && (
        <EditTaskForm
          task={task}
          currentUser={currentUser}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditing(false)}
          onError={onError}
        />
      )}

      {/* ─── アクションボタン ─────────────────────────────────────────────── */}
      {!isEditing && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* 子: はじめるボタン（pending のみ） */}
          <StartButton
            taskId={task.taskId}
            taskStatus={task.status}
            assignedTo={task.assignedTo}
            currentUser={currentUser}
            onSuccess={onTaskUpdate}
            onError={onError}
          />
          {/* 子: 完了ボタン（working のみ） */}
          <CompleteButton
            taskId={task.taskId}
            taskStatus={task.status}
            assignedTo={task.assignedTo}
            currentUser={currentUser}
            onSuccess={onTaskUpdate}
            onError={onError}
          />
          {/* 親: 承認ボタン（completed のみ） */}
          <ApproveButton
            taskId={task.taskId}
            taskStatus={task.status}
            rewardPoints={task.rewardPoints}
            assignedTo={task.assignedTo}
            currentUser={currentUser}
            onSuccess={onTaskUpdate}
            onError={onError}
          />
          {/* 親: 差し戻しボタン（completed または working） */}
          <RejectButton
            taskId={task.taskId}
            taskStatus={task.status}
            currentUser={currentUser}
            onSuccess={onTaskUpdate}
            onError={onError}
          />
          {/* 親: 編集ボタン（pending のみ） */}
          {currentUser.role === 'parent' && task.status === 'pending' && (
            <button
              onClick={() => setIsEditing(true)}
              style={editBtnStyle}
              onMouseEnter={() => setEditHovered(true)}
              onMouseLeave={() => setEditHovered(false)}
            >
              ✎ EDIT
            </button>
          )}
          {/* 親: 削除ボタン（pending のみ） */}
          <DeleteButton
            taskId={task.taskId}
            taskStatus={task.status}
            currentUser={currentUser}
            onSuccess={onTaskUpdate}
            onError={onError}
          />
          {/* 親: コピーして作成ボタン（全ステータス） */}
          {currentUser.role === 'parent' && onCopy && (
            <button
              onClick={() => onCopy(task)}
              style={copyBtnStyle}
              onMouseEnter={() => setCopyHovered(true)}
              onMouseLeave={() => setCopyHovered(false)}
            >
              ⧉ COPY
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Made with Bob
