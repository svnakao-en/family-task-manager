import { FirestoreDataConverter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { RewardData } from '@/types';
import { buildRewardData } from '@/lib/storeUtils';

export const rewardConverter: FirestoreDataConverter<RewardData> = {
  fromFirestore(snap: QueryDocumentSnapshot): RewardData {
    return buildRewardData(snap.data(), snap.id);
  },
  toFirestore(reward: RewardData): DocumentData {
    const data: DocumentData = {
      family_id: reward.familyId,
      title: reward.title,
      required_points: reward.requiredPoints,
      is_active: reward.isActive,
      created_by: reward.createdBy,
    };
    if (reward.description !== undefined) data.description = reward.description;
    if (reward.stock !== undefined) data.stock = reward.stock;
    return data;
  },
};
