import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase/firebase-config.template'
import { DocumentTracking, DocumentStatus, DocumentStage } from '@/types'

/**
 * Creates automatic document tracking when a sale is made to an end customer
 */
export async function createDocumentTracking(
  saleTransactionId: string,
  customerName: string,
  motorFingerprint: string,
  chassisNumber: string,
  userId: string
): Promise<string> {
  try {
    const initialStage: Omit<DocumentStage, 'date'> & { date: any } = {
      status: 'pending_submission',
      date: serverTimestamp(),
      updatedBy: userId,
      notes: 'تم إنشاء طلب تتبع الوثيقة تلقائياً بعد البيع'
    }

    const documentTracking: Omit<DocumentTracking, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any; updatedAt: any; stages: any[] } = {
      saleTransactionId,
      customerName,
      motorFingerprint,
      chassisNumber,
      status: 'pending_submission',
      stages: [initialStage],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    const docRef = await addDoc(collection(db, 'document_tracking'), documentTracking)
    
    console.log('Document tracking created:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('Error creating document tracking:', error)
    throw error
  }
}

/**
 * Updates document tracking status
 */
export async function updateDocumentStatus(
  documentId: string,
  newStatus: DocumentStatus,
  userId: string,
  notes?: string
): Promise<void> {
  try {
    // This would update the document in Firebase
    // Implementation depends on your specific requirements
    console.log('Updating document status:', { documentId, newStatus, userId, notes })
  } catch (error) {
    console.error('Error updating document status:', error)
    throw error
  }
}
