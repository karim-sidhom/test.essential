/**
 * ALGORITHMES AVANCÉS DE RECHERCHE & TRI
 * LORD SYSTEM PWA - Optimisations pour performances maximales
 */

// ════════════════════════════════════════════════════════════════════
// 1️⃣ ALGORITHME DE CLASSEMENT PAR PERTINENCE (TF-IDF)
// ════════════════════════════════════════════════════════════════════

class TFIDFRanker {
  constructor(documents) {
    this.documents = documents;
    this.vocabulary = new Set();
    this.documentFrequency = {};
    this.idfValues = {};
    this.tfValues = {};
    this.build();
  }

  build() {
    // Construire le vocabulaire
    this.documents.forEach(doc => {
      const tokens = this.tokenize(doc.text);
      tokens.forEach(token => this.vocabulary.add(token));
    });

    // Calculer le document frequency (DF)
    this.vocabulary.forEach(term => {
      this.documentFrequency[term] = 0;
      this.documents.forEach(doc => {
        const tokens = this.tokenize(doc.text);
        if (tokens.includes(term)) {
          this.documentFrequency[term]++;
        }
      });
    });

    // Calculer l'IDF
    const N = this.documents.length;
    this.vocabulary.forEach(term => {
      this.idfValues[term] = Math.log(N / (1 + this.documentFrequency[term]));
    });

    console.log('✅ TF-IDF Ranker construit:', this.vocabulary.size, 'termes');
  }

  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^\w\u0600-\u06FF\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  rank(query) {
    const queryTokens = this.tokenize(query);
    const scores = [];

    this.documents.forEach((doc, index) => {
      const docTokens = this.tokenize(doc.text);
      let score = 0;

      queryTokens.forEach(term => {
        if (this.idfValues[term]) {
          const tf = docTokens.filter(t => t === term).length / docTokens.length;
          const idf = this.idfValues[term];
          score += tf * idf;
        }
      });

      if (score > 0) {
        scores.push({ index, document: doc, score });
      }
    });

    return scores.sort((a, b) => b.score - a.score);
  }
}

// ════════════════════════════════════════════════════════════════════
// 2️⃣ ALGORITHME DE CLUSTERING (K-MEANS)
// ════════════════════════════════════════════════════════════════════

class SearchClustering {
  /**
   * Grouper les résultats par catégorie/similarité
   */
  static clusterResults(results, clusterCount = 3) {
    if (results.length < clusterCount) return [results];

    const clusters = Array(clusterCount).fill(null).map(() => []);
    const centroids = this.initializeCentroids(results, clusterCount);

    for (let iteration = 0; iteration < 10; iteration++) {
      // Réinitialiser les clusters
      clusters.forEach(c => c.length = 0);

      // Assigner chaque élément au centroïde le plus proche
      results.forEach(item => {
        let minDistance = Infinity;
        let closestCluster = 0;

        centroids.forEach((centroid, i) => {
          const distance = this.distance(item, centroid);
          if (distance < minDistance) {
            minDistance = distance;
            closestCluster = i;
          }
        });

        clusters[closestCluster].push(item);
      });

      // Calculer les nouveaux centroides
      const newCentroids = clusters.map(cluster => 
        this.calculateCentroid(cluster)
      );

      // Vérifier la convergence
      if (JSON.stringify(centroids) === JSON.stringify(newCentroids)) {
        break;
      }

      centroids.forEach((c, i) => {
        centroids[i] = newCentroids[i];
      });
    }

    return clusters.filter(c => c.length > 0);
  }

  static initializeCentroids(results, k) {
    const centroids = [];
    for (let i = 0; i < k; i++) {
      const randomIndex = Math.floor(Math.random() * results.length);
      centroids.push(results[randomIndex]);
    }
    return centroids;
  }

  static distance(item1, item2) {
    let distance = 0;
    
    // Distance basée sur la catégorie
    if (item1.category !== item2.category) distance += 1;
    
    // Distance basée sur le rating
    distance += Math.abs((item1.rating || 0) - (item2.rating || 0));
    
    // Distance basée sur la distance géographique
    if (item1.lat && item2.lat && item1.lng && item2.lng) {
      distance += Math.abs(item1.distance - item2.distance) / 10;
    }
    
    return distance;
  }

  static calculateCentroid(cluster) {
    if (cluster.length === 0) return {};

    const avgRating = cluster.reduce((sum, item) => sum + (item.rating || 0), 0) / cluster.length;
    const categories = cluster.map(item => item.category);
    const mostCommonCategory = categories
      .sort((a, b) => categories.filter(x => x === a).length - categories.filter(x => x === b).length)
      .pop();

    return {
      category: mostCommonCategory,
      rating: avgRating,
      lat: cluster.reduce((sum, item) => sum + (item.lat || 0), 0) / cluster.length,
      lng: cluster.reduce((sum, item) => sum + (item.lng || 0), 0) / cluster.length,
      distance: cluster.reduce((sum, item) => sum + (item.distance || 0), 0) / cluster.length
    };
  }
}

// ════════════════════════════════════════════════════════════════════
// 3️⃣ ALGORITHME DE RECOMMANDATION (COLLABORATIVE FILTERING)
// ════════════════════════════════════════════════════════════════════

class RecommendationEngine {
  constructor() {
    this.userProfiles = new Map();
    this.itemSimilarity = new Map();
  }

  /**
   * Enregistrer l'interaction d'un utilisateur
   */
  recordInteraction(userId, itemId, interactionType = 'view', weight = 1) {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {});
    }

    const profile = this.userProfiles.get(userId);
    const key = `${itemId}:${interactionType}`;
    profile[key] = (profile[key] || 0) + weight;
  }

  /**
   * Obtenir des recommandations personnalisées
   */
  getRecommendations(userId, items, count = 5) {
    const userProfile = this.userProfiles.get(userId) || {};
    const scores = new Map();

    items.forEach(item => {
      let score = 0;

      // Score basé sur le profil utilisateur
      Object.entries(userProfile).forEach(([key, value]) => {
        if (key.startsWith(item.id)) {
          score += value * 10;
        }
      });

      // Score basé sur la popularité
      const popularity = (item.viewCount || 0) / 100;
      score += popularity;

      // Score basé sur le rating
      score += (item.rating || 0) * 2;

      // Score basé sur la similarité avec d'autres items aimés
      Object.keys(userProfile).forEach(likedItemKey => {
        const [likedItemId] = likedItemKey.split(':');
        if (this.itemSimilarity.has(`${likedItemId}:${item.id}`)) {
          score += this.itemSimilarity.get(`${likedItemId}:${item.id}`) * 5;
        }
      });

      if (score > 0) {
        scores.set(item.id, { ...item, recommendationScore: score });
      }
    });

    return Array.from(scores.values())
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, count);
  }
}

// ════════════════════════════════════════════════════════════════════
// 4️⃣ ALGORITHME DE PAGINATION INTELLIGENTE
// ════════════════════════════════════════════════════════════════════

class SmartPagination {
  /**
   * Charger les résultats de manière intelligente (lazy loading)
   */
  static createPaginatedLoad(results, batchSize = 20) {
    let currentIndex = 0;

    return {
      getNextBatch: () => {
        const batch = results.slice(currentIndex, currentIndex + batchSize);
        currentIndex += batchSize;
        return batch;
      },
      hasMore: () => currentIndex < results.length,
      getRemainingCount: () => Math.max(0, results.length - currentIndex),
      reset: () => { currentIndex = 0; }
    };
  }

  /**
   * Estimation du temps de chargement
   */
  static estimateLoadTime(itemCount, networkSpeed = 'medium') {
    const speeds = {
      'slow': 0.5,     // 3G
      'medium': 0.2,   // 4G
      'fast': 0.05     // 5G
    };

    const timePerItem = speeds[networkSpeed] || speeds.medium;
    return itemCount * timePerItem;
  }
}

// ════════════════════════════════════════════════════════════════════
// 5️⃣ ALGORITHME DE CACHE INTELLIGENT
// ════════════════════════════════════════════════════════════════════

class SmartCache {
  constructor(maxSize = 50) {
    this.cache = new Map();
    this.accessCount = new Map();
    this.timestamps = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Ajouter avec tracking d'accès
   */
  set(key, value, ttl = 3600) {
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    this.cache.set(key, value);
    this.accessCount.set(key, 0);
    this.timestamps.set(key, Date.now() + (ttl * 1000));
  }

  /**
   * Récupérer et tracker l'accès
   */
  get(key) {
    if (!this.cache.has(key)) return null;

    // Vérifier l'expiration
    if (Date.now() > this.timestamps.get(key)) {
      this.cache.delete(key);
      return null;
    }

    // Incrementer le compteur d'accès
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
    return this.cache.get(key);
  }

  /**
   * Éviction LRU (Least Recently Used) avec bonus pour items fréquents
   */
  evict() {
    let minScore = Infinity;
    let keyToEvict = null;

    for (const [key, count] of this.accessCount.entries()) {
      const age = Date.now() - this.timestamps.get(key);
      const score = count / (age / 1000); // Fréquence / Âge

      if (score < minScore) {
        minScore = score;
        keyToEvict = key;
      }
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.accessCount.delete(keyToEvict);
      this.timestamps.delete(keyToEvict);
    }
  }

  clear() {
    this.cache.clear();
    this.accessCount.clear();
    this.timestamps.clear();
  }

  stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      totalAccess: Array.from(this.accessCount.values()).reduce((a, b) => a + b, 0)
    };
  }

  calculateHitRate() {
    const totalAccess = Array.from(this.accessCount.values()).reduce((a, b) => a + b, 0);
    return totalAccess > 0 ? (totalAccess / this.cache.size).toFixed(2) : 0;
  }
}

// ════════════════════════════════════════════════════════════════════
// 6️⃣ ALGORITHME DE CORRECTION D'ORTHOGRAPHE (SPELL CHECK)
// ════════════════════════════════════════════════════════════════════

class SpellChecker {
  constructor(dictionary = []) {
    this.dictionary = new Set(dictionary.map(word => word.toLowerCase()));
  }

  /**
   * Trouver des suggestions pour un mot mal orthographié
   */
  getSuggestions(word, maxDistance = 2) {
    const suggestions = [];

    this.dictionary.forEach(dictWord => {
      const distance = this.levenshteinDistance(word.toLowerCase(), dictWord);
      if (distance <= maxDistance && distance > 0) {
        suggestions.push({
          word: dictWord,
          distance,
          confidence: 1 - (distance / Math.max(word.length, dictWord.length))
        });
      }
    });

    return suggestions
      .sort((a, b) => a.distance - b.distance || b.confidence - a.confidence)
      .map(s => s.word);
  }

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
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + cost
        );
      }
    }

    return d[len1][len2];
  }
}

// ════════════════════════════════════════════════════════════════════
// 7️⃣ ANALYSEUR DE PERFORMANCE
// ════════════════════════════════════════════════════════════════════

class SearchPerformanceAnalyzer {
  constructor() {
    this.metrics = [];
    this.startTime = null;
  }

  /**
   * Commencer à mesurer
   */
  start() {
    this.startTime = performance.now();
  }

  /**
   * Terminer et enregistrer
   */
  end(queryLength, resultsCount) {
    const duration = performance.now() - this.startTime;
    this.metrics.push({
      timestamp: Date.now(),
      duration,
      queryLength,
      resultsCount,
      efficiency: resultsCount / (duration / 1000) // résultats par seconde
    });
    return duration;
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    if (this.metrics.length === 0) return null;

    const avgDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length;
    const avgResults = this.metrics.reduce((sum, m) => sum + m.resultsCount, 0) / this.metrics.length;
    const avgEfficiency = this.metrics.reduce((sum, m) => sum + m.efficiency, 0) / this.metrics.length;

    return {
      totalSearches: this.metrics.length,
      avgDuration: avgDuration.toFixed(2) + ' ms',
      avgResults: Math.round(avgResults),
      avgEfficiency: avgEfficiency.toFixed(2) + ' results/sec',
      fastestSearch: Math.min(...this.metrics.map(m => m.duration)).toFixed(2) + ' ms',
      slowestSearch: Math.max(...this.metrics.map(m => m.duration)).toFixed(2) + ' ms'
    };
  }

  /**
   * Afficher les statistiques dans la console
   */
  logStats() {
    const stats = this.getStats();
    if (stats) {
      console.table(stats);
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// EXPORT POUR UTILISATION
// ════════════════════════════════════════════════════════════════════

const advancedAlgorithms = {
  TFIDFRanker,
  SearchClustering,
  RecommendationEngine,
  SmartPagination,
  SmartCache,
  SpellChecker,
  SearchPerformanceAnalyzer
};

console.log('✅ Algorithmes avancés chargés');
