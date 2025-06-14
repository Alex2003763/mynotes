// 離線快取功能測試腳本
// 在瀏覽器開發者工具的控制台中運行此腳本來測試離線快取功能

async function testOfflineCache() {
  console.log('🧪 開始測試離線快取功能...');
  
  try {
    // 測試快取服務是否可用
    if (!('caches' in window)) {
      console.error('❌ 瀏覽器不支援 Cache API');
      return;
    }
    
    if (!('indexedDB' in window)) {
      console.error('❌ 瀏覽器不支援 IndexedDB');
      return;
    }
    
    console.log('✅ 瀏覽器支援必要的快取 API');
    
    // 檢查快取狀態
    if (window.OfflineCacheService) {
      const status = await window.OfflineCacheService.getCacheStatus();
      console.log('📊 快取狀態:', status);
      
      // 測試快取筆記
      const testNotes = [
        {
          id: 'test-1',
          title: '測試筆記 1',
          content: '這是一個測試筆記',
          tags: ['測試'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          pages: [{
            id: 'page-1',
            title: 'Page 1',
            content: '這是一個測試筆記'
          }]
        }
      ];
      
      await window.OfflineCacheService.cacheNotes(testNotes);
      console.log('✅ 成功快取測試筆記');
      
      const cachedNotes = await window.OfflineCacheService.getCachedNotes();
      console.log('📝 快取的筆記:', cachedNotes);
      
      // 測試快取設置
      const testSettings = {
        theme: 'dark',
        language: 'zh',
        fontSize: 'medium'
      };
      
      await window.OfflineCacheService.cacheSettings(testSettings);
      console.log('✅ 成功快取測試設置');
      
      const cachedSettings = await window.OfflineCacheService.getCachedSettings();
      console.log('⚙️ 快取的設置:', cachedSettings);
      
      // 測試翻譯快取
      if (window.TranslationCacheService) {
        const testTranslations = {
          general: {
            hello: '你好',
            goodbye: '再見'
          }
        };
        
        await window.TranslationCacheService.cacheTranslations('zh', testTranslations);
        console.log('✅ 成功快取測試翻譯');
        
        const cachedTranslations = await window.TranslationCacheService.getCachedTranslations('zh');
        console.log('🌐 快取的翻譯:', cachedTranslations);
      }
      
    } else {
      console.error('❌ OfflineCacheService 不可用');
    }
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
  }
}

// 模擬離線狀態測試
async function testOfflineMode() {
  console.log('🔄 測試離線模式...');
  
  // 檢查當前網路狀態
  console.log('🌐 當前網路狀態:', navigator.onLine ? '在線' : '離線');
  
  // 監聽網路狀態變化
  window.addEventListener('online', () => {
    console.log('✅ 網路恢復連線');
  });
  
  window.addEventListener('offline', () => {
    console.log('📴 網路已斷線');
  });
  
  console.log('💡 提示：您可以在開發者工具的 Network 標籤中模擬離線狀態');
  console.log('💡 提示：或者在 Application -> Service Workers 中測試離線功能');
}

// 清理測試數據
async function cleanupTestData() {
  console.log('🧹 清理測試數據...');
  
  try {
    if (window.OfflineCacheService) {
      await window.OfflineCacheService.clearAllCaches();
      console.log('✅ 成功清理所有快取');
    }
    
    if (window.TranslationCacheService) {
      window.TranslationCacheService.clearAllCache();
      console.log('✅ 成功清理翻譯快取');
    }
    
  } catch (error) {
    console.error('❌ 清理過程中發生錯誤:', error);
  }
}

// 導出測試函數到全域
window.testOfflineCache = testOfflineCache;
window.testOfflineMode = testOfflineMode;
window.cleanupTestData = cleanupTestData;

console.log('🎯 離線快取測試腳本已載入');
console.log('📋 可用的測試函數:');
console.log('  - testOfflineCache(): 測試快取功能');
console.log('  - testOfflineMode(): 測試離線模式');
console.log('  - cleanupTestData(): 清理測試數據');
console.log('💡 使用方法: 在控制台中輸入函數名稱並執行');