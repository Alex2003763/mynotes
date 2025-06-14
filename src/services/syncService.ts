import { Note } from '../types';
import { addNote, updateNote, deleteNote, getAllNotes } from './dbService';

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  noteId: string;
  noteData?: Note;
  timestamp: number;
}

class SyncService {
  private pendingOperations: PendingOperation[] = [];
  private syncInProgress = false;

  constructor() {
    this.loadPendingOperations();
    this.setupOnlineListener();
  }

  private loadPendingOperations() {
    const stored = localStorage.getItem('mynotes_pending_sync');
    if (stored) {
      try {
        this.pendingOperations = JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load pending operations:', error);
        this.pendingOperations = [];
      }
    }
  }

  private savePendingOperations() {
    localStorage.setItem('mynotes_pending_sync', JSON.stringify(this.pendingOperations));
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      this.processPendingOperations();
    });
  }

  // 添加待同步操作
  addPendingOperation(type: 'create' | 'update' | 'delete', noteId: string, noteData?: Note) {
    const operation: PendingOperation = {
      id: `${type}_${noteId}_${Date.now()}`,
      type,
      noteId,
      noteData,
      timestamp: Date.now()
    };

    // 移除同一筆記的舊操作（除了刪除操作）
    if (type !== 'delete') {
      this.pendingOperations = this.pendingOperations.filter(
        op => !(op.noteId === noteId && op.type !== 'delete')
      );
    }

    this.pendingOperations.push(operation);
    this.savePendingOperations();

    // 如果在線，立即嘗試同步
    if (navigator.onLine) {
      this.processPendingOperations();
    }
  }

  // 處理待同步操作
  async processPendingOperations() {
    if (this.syncInProgress || !navigator.onLine || this.pendingOperations.length === 0) {
      return;
    }

    this.syncInProgress = true;
    this.showSyncNotification('正在同步數據...');

    try {
      const operations = [...this.pendingOperations];
      const processedOperations: string[] = [];

      for (const operation of operations) {
        try {
          await this.processOperation(operation);
          processedOperations.push(operation.id);
        } catch (error) {
          console.error(`Failed to process operation ${operation.id}:`, error);
          // 保留失敗的操作，稍後重試
        }
      }

      // 移除已成功處理的操作
      this.pendingOperations = this.pendingOperations.filter(
        op => !processedOperations.includes(op.id)
      );
      this.savePendingOperations();

      if (processedOperations.length > 0) {
        this.showSyncNotification(`成功同步 ${processedOperations.length} 項更改`, 'success');
      }

    } catch (error) {
      console.error('Sync error:', error);
      this.showSyncNotification('同步失敗，將稍後重試', 'error');
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processOperation(operation: PendingOperation) {
    switch (operation.type) {
      case 'create':
      case 'update':
        if (operation.noteData) {
          // 這裡可以添加與雲端服務的同步邏輯
          // 目前只更新本地數據庫
          await (operation.type === 'create' ? addNote : updateNote)(operation.noteData);
        }
        break;
      case 'delete':
        // 這裡可以添加與雲端服務的同步邏輯
        // 目前只從本地數據庫刪除
        await deleteNote(operation.noteId);
        break;
    }
  }

  private showSyncNotification(message: string, type: 'info' | 'success' | 'error' = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 
                   type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm max-w-xs`;
    notification.textContent = message;
    
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  // 獲取待同步操作數量
  getPendingOperationsCount(): number {
    return this.pendingOperations.length;
  }

  // 手動觸發同步
  async forcSync() {
    await this.processPendingOperations();
  }

  // 清除所有待同步操作（謹慎使用）
  clearPendingOperations() {
    this.pendingOperations = [];
    this.savePendingOperations();
  }

  // 檢查是否有待同步的更改
  hasPendingChanges(): boolean {
    return this.pendingOperations.length > 0;
  }

  // 導出數據以供備份
  async exportData() {
    const notes = await getAllNotes();
    const exportData = {
      notes,
      pendingOperations: this.pendingOperations,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    return exportData;
  }

  // 導入數據
  async importData(data: any) {
    if (data.notes && Array.isArray(data.notes)) {
      // 這裡可以添加數據驗證邏輯
      for (const note of data.notes) {
        await addNote(note);
      }
    }
    
    if (data.pendingOperations && Array.isArray(data.pendingOperations)) {
      this.pendingOperations = [...this.pendingOperations, ...data.pendingOperations];
      this.savePendingOperations();
    }
  }
}

export const syncService = new SyncService();