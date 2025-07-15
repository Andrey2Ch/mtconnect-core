// Простая проверка записей в MongoDB
const { MongoClient } = require('mongodb');

async function checkMongoDB() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('✅ Подключен к MongoDB');
    
    const db = client.db('mtconnect');
    
    // Проверяем коллекции
    const collections = await db.listCollections().toArray();
    console.log('📂 Коллекции:', collections.map(c => c.name));
    
    // Проверяем количество документов
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`📊 ${collection.name}: ${count} документов`);
      
      if (count > 0) {
        const lastDoc = await db.collection(collection.name).findOne({}, { sort: { _id: -1 } });
        console.log(`🔍 Последний документ в ${collection.name}:`, JSON.stringify(lastDoc, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await client.close();
  }
}

checkMongoDB(); 