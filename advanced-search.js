/**
 * SEARCH ENGINE AVANCÉ — LORD SYSTEM PWA
 * Recherche intelligente, fuzzy matching, filtres, relevance ranking
 */

class AdvancedSearchEngine {
  constructor(options = {}) {
    this.options = {
      maxResults: 50,
      fuzzyThreshold: 0.6,
      cacheResults: true,
      enableHistory: true,
      enableSuggestions: true,
      ...options
    };
    
    this.cache = new Map();
    this.searchHistory = this.loadHistory();
    this.data = [];
    this.indexedData = {};
  }

  /**
   * Index les données pour une recherche rapide
   */
  indexData(data) {
    this.data = data;
    this.indexedData = {};
    
    data.forEach((item, index) => {
      // Index par mots clés
      const keywords = this.extractKeywords(item);
      keywords.forEach(keyword => {
        if (!this.indexedData[keyword]) {
          this.indexedData[keyword] = [];
        }
        this.indexedData[keyword].push(index);
      });
    });
    
    console.log('✅ Index créé:', Object.keys(this.indexedData).length, 'mots clés');
  }

  /**
   * Extraire les mots clés d'un élément
   */
  extractKeywords(item) {
    const keywords = new Set();
    
    // Ajouter le nom
    if (item.name) {
      this.tokenize(item.name).forEach(k => keywords.add(k));
      keywords.add(item.name.toLowerCase());
    }
    
    // Ajouter la description
    if (item.description) {
      this.tokenize(item.description).forEach(k => keywords.add(k));
    }
    
    // Ajouter les catégories
    if (item.category) {
      keywords.add(item.category.toLowerCase());
    }
    
    // Ajouter les tags
    if (item.tags) {
      item.tags.forEach(tag => keywords.add(tag.toLowerCase()));
    }
    
    return Array.from(keywords);
  }

  /**
   * Tokeniser le texte en mots
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\u0600-\u06FF\s]/g, '') // Support arabe + lettres
      .split(/\s+/)
      .filter(token => token.length > 2); // Ignorer les mots courts
  }

  /**
   * RECHERCHE PRINCIPALE - Fusionne tous les algorithmes
   */
  search(query, filters = {}) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const cacheKey = `${query}|${JSON.stringify(filters)}`;
    
    // Vérifier le cache
    if (this.options.cacheResults && this.cache.has(cacheKey)) {
      console.log('💾 Résultat du cache');
      return this.cache.get(cacheKey);
    }

    // Sauvegarder dans l'historique
    if (this.options.enableHistory) {
      this.saveToHistory(query);
    }

    // Recherche combinée
    const results = this.combinedSearch(query, filters);

    // Sauvegarder en cache
    if (this.options.cacheResults) {
      this.cache.set(cacheKey, results);
    }

    return results.slice(0, this.options.maxResults);
  }

  /**
   * Recherche combinée (multiple algorithmes)
   */
  combinedSearch(query, filters) {
    const results = new Map(); // Pour éviter les doublons

    // 1. Recherche exacte (poids: 100)
    this.exactSearch(query).forEach(item => {
      if (!results.has(item.id)) {
        results.set(item.id, { ...item, relevance: 100, matchType: 'exact' });
      } else {
        results.get(item.id).relevance = Math.max(results.get(item.id).relevance, 100);
      }
    });

    // 2. Recherche par prefix (poids: 80)
    this.prefixSearch(query).forEach(item => {
      const id = item.id;
      if (!results.has(id)) {
        results.set(id, { ...item, relevance: 80, matchType: 'prefix' });
      } else if (results.get(id).relevance < 80) {
        results.get(id).relevance = 80;
        results.get(id).matchType = 'prefix';
      }
    });

    // 3. Recherche fuzzy (poids: 60)
    this.fuzzySearch(query).forEach(item => {
      const id = item.id;
      const score = item.score;
      if (!results.has(id)) {
        results.set(id, { ...item, relevance: Math.round(60 * score), matchType: 'fuzzy' });
      } else {
        const newScore = Math.round(60 * score);
        if (newScore > results.get(id).relevance) {
          results.get(id).relevance = newScore;
          results.get(id).matchType = 'fuzzy';
        }
      }
    });

    // 4. Recherche par mots clés (poids: 40)
    this.keywordSearch(query).forEach(item => {
      const id = item.id;
      if (!results.has(id)) {
        results.set(id, { ...item, relevance: 40, matchType: 'keyword' });
      } else if (results.get(id).relevance < 40) {
        results.get(id).relevance = 40;
        results.get(id).matchType = 'keyword';
      }
    });

    // 5. Appliquer les filtres
    let filtered = Array.from(results.values());
    if (Object.keys(filters).length > 0) {
      filtered = this.applyFilters(filtered, filters);
    }

    // 6. Trier par pertinence
    return filtered.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * EXACT SEARCH - Correspondance exacte
   */
  exactSearch(query) {
    const q = query.toLowerCase().trim();
    return this.data.filter(item => {
      if (item.name && item.name.toLowerCase() === q) return true;
      if (item.keywords && item.keywords.includes(q)) return true;
      return false;
    });
  }

  /**
   * PREFIX SEARCH - Commence par le query
   */
  prefixSearch(query) {
    const q = query.toLowerCase().trim();
    return this.data.filter(item => {
      if (item.name && item.name.toLowerCase().startsWith(q)) return true;
      const keywords = item.keywords || [];
      if (keywords.some(k => k.toLowerCase().startsWith(q))) return true;
      return false;
    });
  }

  /**
   * FUZZY SEARCH - Correspondance floue (tolérance d'erreurs)
   * Utilise l'algorithme de Levenshtein
   */
  fuzzySearch(query) {
    const q = query.toLowerCase().trim();
    const results = [];

    this.data.forEach((item, index) => {
      let maxScore = 0;

      // Calculer la distance pour le nom
      if (item.name) {
        const score = 1 - (this.levenshteinDistance(q, item.name.toLowerCase()) / 
                          Math.max(q.length, item.name.length));
        maxScore = Math.max(maxScore, score);
      }

      // Calculer pour les mots clés
      if (item.keywords) {
        item.keywords.forEach(keyword => {
          const score = 1 - (this.levenshteinDistance(q, keyword) / 
                            Math.max(q.length, keyword.length));
          maxScore = Math.max(maxScore, score);
        });
      }

      if (maxScore >= this.options.fuzzyThreshold) {
        results.push({
          ...item,
          id: item.id || index,
          score: maxScore
        });
      }
    });

    return results;
  }

  /**
   * Distance de Levenshtein (édition minimale)
   */
  levenshteinDistance(s1, s2) {
    const len1 = s1.length;
    const len2 = s2.length;
    const d = Array(len1 + 1).fill(0).map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) d[i][0] = i;
    for (let j = 0; j <= len2; j++) d[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,     // deletion
          d[i][j - 1] + 1,     // insertion
          d[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return d[len1][len2];
  }

  /**
   * KEYWORD SEARCH - Recherche par mots clés indexés
   */
  keywordSearch(query) {
    const tokens = this.tokenize(query);
    const matchedIndices = new Set();

    tokens.forEach(token => {
      if (this.indexedData[token]) {
        this.indexedData[token].forEach(index => matchedIndices.add(index));
      }
    });

    return Array.from(matchedIndices).map(index => ({
      ...this.data[index],
      id: this.data[index].id || index
    }));
  }

  /**
   * APPLIQUER LES FILTRES
   */
  applyFilters(results, filters) {
    return results.filter(item => {
      // Filtre par catégorie
      if (filters.category && item.category !== filters.category) {
        return false;
      }

      // Filtre par distance (si applicable)
      if (filters.maxDistance && item.distance > filters.maxDistance) {
        return false;
      }

      // Filtre par rating
      if (filters.minRating && (item.rating || 0) < filters.minRating) {
        return false;
      }

      // Filtre personnalisé
      if (filters.custom && typeof filters.custom === 'function') {
        return filters.custom(item);
      }

      return true;
    });
  }

  /**
   * SUGGESTIONS INTELLIGENTES (Autocomplete)
   */
  getSuggestions(query, limit = 10) {
    if (!query || query.length < 2) {
      return this.getPopularSearches(limit);
    }

    const suggestions = new Map();
    const q = query.toLowerCase();

    // Suggestions basées sur le prefix
    this.data.forEach(item => {
      if (item.name && item.name.toLowerCase().startsWith(q)) {
        const key = item.name;
        if (!suggestions.has(key)) {
          suggestions.set(key, { text: key, type: 'name', frequency: 0 });
        }
        suggestions.get(key).frequency++;
      }

      // Suggestions basées sur les mots clés
      if (item.keywords) {
        item.keywords.forEach(keyword => {
          if (keyword.startsWith(q)) {
            if (!suggestions.has(keyword)) {
              suggestions.set(keyword, { text: keyword, type: 'keyword', frequency: 0 });
            }
            suggestions.get(keyword).frequency++;
          }
        });
      }
    });

    // Suggestions récentes
    this.searchHistory.forEach(historyItem => {
      if (historyItem.startsWith(q)) {
        if (!suggestions.has(historyItem)) {
          suggestions.set(historyItem, { text: historyItem, type: 'history', frequency: 0 });
        }
        suggestions.get(historyItem).frequency++;
      }
    });

    // Trier par fréquence
    return Array.from(suggestions.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit)
      .map(s => s.text);
  }

  /**
   * RECHERCHES POPULAIRES
   */
  getPopularSearches(limit = 5) {
    const frequency = new Map();

    this.searchHistory.forEach(search => {
      frequency.set(search, (frequency.get(search) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([search]) => search);
  }

  /**
   * HISTORIQUE DE RECHERCHE
   */
  saveToHistory(query) {
    const q = query.toLowerCase().trim();
    
    // Supprimer les doublons
    this.searchHistory = this.searchHistory.filter(item => item !== q);
    
    // Ajouter au début
    this.searchHistory.unshift(q);
    
    // Garder seulement les 50 dernières
    this.searchHistory = this.searchHistory.slice(0, 50);
    
    // Sauvegarder en localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
      } catch (e) {
        console.warn('Impossible de sauvegarder l\'historique:', e);
      }
    }
  }

  loadHistory() {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('searchHistory') || '[]');
      } catch (e) {
        console.warn('Impossible de charger l\'historique:', e);
        return [];
      }
    }
    return [];
  }

  clearHistory() {
    this.searchHistory = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('searchHistory');
    }
  }

  /**
   * STATISTIQUES DE RECHERCHE
   */
  getStats() {
    return {
      totalSearches: this.searchHistory.length,
      uniqueSearches: new Set(this.searchHistory).size,
      cacheSize: this.cache.size,
      indexSize: Object.keys(this.indexedData).length,
      dataItems: this.data.length
    };
  }

  /**
   * RECHERCHE GÉOGRAPHIQUE (Distance)
   */
  searchByDistance(userLat, userLng, maxDistance = 5) {
    return this.data
      .map(item => ({
        ...item,
        distance: this.calculateDistance(userLat, userLng, item.lat, item.lng)
      }))
      .filter(item => item.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Rayon terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * EXPORTER LES RÉSULTATS
   */
  exportResults(results, format = 'json') {
    if (format === 'csv') {
      return this.convertToCSV(results);
    } else if (format === 'json') {
      return JSON.stringify(results, null, 2);
    }
    return results;
  }

  convertToCSV(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ];
    
    return csv.join('\n');
  }
}

// Export pour utilisation
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdvancedSearchEngine;
}

// Initialisation globale
const searchEngine = new AdvancedSearchEngine({
  maxResults: 50,
  fuzzyThreshold: 0.65,
  cacheResults: true,
  enableHistory: true,
  enableSuggestions: true
});

console.log('🔍 Moteur de recherche avancé chargé');
