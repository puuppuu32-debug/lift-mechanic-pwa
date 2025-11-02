// db.js - Простая база документов для PWA с поддержкой офлайн-кэширования
class DocumentManager {
    constructor() {
        this.storageKey = 'lift_documents';
        this.documents = this.loadDocuments();
    }

    loadDocuments() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            return JSON.parse(stored);
        }
        
        // Начальные документы для демонстрации
        return [
            {
                id: 1,
                name: "Инструкция по ТО лифтов KONE (PDF)",
                url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                category: "instructions",
                added: "2024-01-15",
                cached: false
            },
            {
                id: 2, 
                name: "Схема электропитания OTIS Gen2 (PDF)",
                url: "https://www.africau.edu/images/default/sample.pdf",
                category: "schemes",
                added: "2024-01-10",
                cached: false
            },
            {
                id: 3,
                name: "Правила безопасности (текст)",
                url: "https://filesamples.com/samples/document/txt/sample3.txt",
                category: "safety", 
                added: "2024-01-05",
                cached: false
            },
            {
                id: 4,
                name: "Пример изображения схемы",
                url: "https://via.placeholder.com/800x600/667eea/ffffff?text=Схема+лифта",
                category: "schemes",
                added: "2024-01-03",
                cached: false
            }
        ];
    }

    saveDocuments() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.documents));
    }

    getAllDocuments() {
        return this.documents;
    }

    addDocument(name, url, category = "other") {
        const newDoc = {
            id: Date.now(),
            name: name,
            url: url,
            category: category,
            added: new Date().toISOString().split('T')[0],
            cached: false
        };
        
        this.documents.unshift(newDoc);
        this.saveDocuments();
        return newDoc;
    }

    deleteDocument(id) {
        this.documents = this.documents.filter(doc => doc.id !== id);
        this.saveDocuments();
    }

    searchDocuments(query) {
        const searchTerm = query.toLowerCase();
        return this.documents.filter(doc => 
            doc.name.toLowerCase().includes(searchTerm) ||
            doc.category.toLowerCase().includes(searchTerm)
        );
    }

    getCategories() {
        const categories = {};
        this.documents.forEach(doc => {
            categories[doc.category] = (categories[doc.category] || 0) + 1;
        });
        return categories;
    }

    updateDocumentCacheStatus(id, cached) {
        const doc = this.documents.find(d => d.id === id);
        if (doc) {
            doc.cached = cached;
            this.saveDocuments();
        }
    }

    getCachedDocuments() {
        return this.documents.filter(doc => doc.cached);
    }
}

// Создаем глобальный экземпляр менеджера документов
window.docManager = new DocumentManager();