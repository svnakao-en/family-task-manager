import { FirestoreDataConverter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { ExchangeData } from '@/types';
import { buildExchangeData } from '@/lib/storeUtils';

export const exchangeConverter: FirestoreDataConverter<ExchangeData> = {
  fromFirestore(snap: QueryDocumentSnapshot): ExchangeData {
    return buildExchangeData(snap.data(), snap.id);
  },
  toFirestore(exchange: ExchangeData): DocumentData {
    const data: DocumentData = {
      family_id: exchange.familyId,
      reward_id: exchange.rewardId,
      reward_title: exchange.rewardTitle,
      child_name: exchange.childName,
      required_points: exchange.requiredPoints,
      status: exchange.status,
      requested_by: exchange.requestedBy,
    };
    if (exchange.deliveredBy !== undefined) data.delivered_by = exchange.deliveredBy;
    if (exchange.deliveredAt !== undefined) data.delivered_at = exchange.deliveredAt;
    if (exchange.rejectedBy !== undefined) data.rejected_by = exchange.rejectedBy;
    if (exchange.rejectedAt !== undefined) data.rejected_at = exchange.rejectedAt;
    if (exchange.rejectedReason !== undefined) data.rejected_reason = exchange.rejectedReason;
    return data;
  },
};
