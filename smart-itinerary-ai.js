/**
 * SMART ITINERARY SYSTEM — LORD SYSTEM PWA
 * Écoute vocale + IA + Scoring multi-critères
 * L'utilisateur parle ses préférences → IA trouve la meilleure combinaison
 */

class SmartItineraryAI {
  constructor(options = {}) {
    this.options = {
      language: 'ar-SA',
      continuous: true,
      interimResults: true,
      maxCriteria: 10,
      ...options
    };

    // Initialiser la reconnaissance vocale
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.setupRecognition();

    // Données des critères
    this.criteria = this.initializeCriteria();
    this.userPreferences = {};
    this.locations = [];
    this.isListening = false;
    this.transcript = '';
  }

  /**
   * Initialiser les 10 critères possibles
   */
  initializeCriteria() {
    return {
      distance: {
        name: 'المسافة',
        weight: 1,
        keywords: ['قريب', 'بعيد', 'القرب', 'كم', 'المسافة'],
        priority: 0,
        reverse: false // Moins = mieux
      },
      quality: {
        name: 'الجودة',
        weight: 1,
        keywords: ['جودة', 'أفضل', 'ممتاز', 'عالي'],
        priority: 0,
        reverse: true // Plus = mieux
      },
      rating: {
        name: 'التقييم',
        weight: 1,
        keywords: ['تقييم', 'نجوم', 'ممتاز', 'جيد'],
        priority: 0,
        reverse: true
      },
      capacity: {
        name: 'السعة',
        weight: 1,
        keywords: ['كبير', 'سعة', 'مكان', 'متسع'],
        priority: 0,
        reverse: true
      },
      facilities: {
        name: 'المرافق',
        weight: 1,
        keywords: ['مرافق', 'وسائل', 'خدمات', 'موقف سيارات'],
        priority: 0,
        reverse: true
      },
      accessibility: {
        name: 'الوصول',
        weight: 1,
        keywords: ['وصول', 'accessible', 'سهل', 'معاق'],
        priority: 0,
        reverse: true
      },
      atmosphere: {
        name: 'الأجواء',
        weight: 1,
        keywords: ['أجواء', 'هدوء', 'مريح', 'جو'],
        priority: 0,
        reverse: true
      },
      timing: {
        name: 'التوقيت',
        weight: 1,
        keywords: ['وقت', 'ساعات', 'فتح', 'إغلاق'],
        priority: 0,
        reverse: true
      },
      price: {
        name: 'السعر',
        weight: 1,
        keywords: ['سعر', 'رخيص', 'بخس', 'تكلفة'],
        priority: 0,
        reverse: false // Moins = mieux
      },
      reviews: {
        name: 'التقييمات',
        weight: 1,
        keywords: ['تقييمات', 'آراء', 'تعليقات', 'نقد'],
        priority: 0,
        reverse: true
      }
    };
  }

  /**
   * Configuration de la reconnaissance vocale
   */
  setupRecognition() {
    this.recognition.continuous = this.options.continuous;
    this.recognition.interimResults = this.options.interimResults;
    this.recognition.lang = this.options.language;

    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('🎤 Écoute en cours...');
      this.onListeningStart?.();
    };

    this.recognition.onresult = (event) => {
      this.transcript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          this.transcript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Callback pour affichage temps réel
      this.onInterimResult?.(interimTranscript);
      
      if (this.transcript) {
        console.log('✅ Reconnu:', this.transcript);
        this.onFinalResult?.(this.transcript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('❌ Erreur vocale:', event.error);
      this.onError?.(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('🛑 Écoute arrêtée');
      this.onListeningEnd?.();
    };
  }

  /**
   * Démarrer l'écoute vocale
   */
  startListening() {
    this.transcript = '';
    this.recognition.start();
  }

  /**
   * Arrêter l'écoute vocale
   */
  stopListening() {
    this.recognition.stop();
  }

  /**
   * EXTRAIRE LES PRÉFÉRENCES du texte
   */
  extractPreferences(text) {
    const preferences = {};
    const textLower = text.toLowerCase();

    Object.entries(this.criteria).forEach(([key, criterion]) => {
      // Vérifier si les mots-clés sont présents
      const found = criterion.keywords.some(keyword => 
        textLower.includes(keyword)
      );

      if (found) {
        // Extraire l'importance (1-10)
        preferences[key] = this.extractImportance(text, key);
      }
    });

    this.userPreferences = preferences;
    return preferences;
  }

  /**
   * Extraire le niveau d'importance (1-10)
   */
  extractImportance(text, criteriaKey) {
    const textLower = text.toLowerCase();
    
    // Patterns pour détecter l'importance
    const veryImportant = /بكل (تأكيد|أكيد)|حتما|لا بد|ضروري|أساسي|critical|must|essential/gi;
    const important = /مهم|ضروري|أساسي|important|significant/gi;
    const nice = /جميل|ممتاز|رائع|nice|good/gi;
    const notImportant = /غير مهم|ليس مهم|optional/gi;

    if (veryImportant.test(text)) return 9;
    if (important.test(text)) return 7;
    if (nice.test(text)) return 5;
    if (notImportant.test(text)) return 2;
    
    return 5; // Score par défaut (neutre)
  }

  /**
   * SCORING MULTI-CRITÈRES - Le cœur du système!
   */
  calculateScores(locations) {
    const scores = [];

    locations.forEach((location, index) => {
      let totalScore = 0;
      let weightSum = 0;
      const breakdown = {}; // Pour justifier chaque score

      Object.entries(this.userPreferences).forEach(([criteriaKey, importance]) => {
        const criterion = this.criteria[criteriaKey];
        const locationValue = location[criteriaKey];

        if (locationValue !== undefined) {
          // Normaliser la valeur (0-10)
          let normalizedValue;
          
          if (criteriaKey === 'distance') {
            // Distance: 0km = 10, 10km+ = 0
            normalizedValue = Math.max(0, 10 - (locationValue / 1));
          } else if (criteriaKey === 'rating') {
            // Rating: 0-5 → 0-10
            normalizedValue = (locationValue / 5) * 10;
          } else if (criteriaKey === 'price') {
            // Price: moins = mieux
            const maxPrice = Math.max(...locations.map(l => l.price || 0));
            normalizedValue = 10 - ((locationValue / maxPrice) * 10);
          } else if (criteriaKey === 'capacity') {
            // Capacity: plus = mieux
            const maxCapacity = Math.max(...locations.map(l => l.capacity || 0));
            normalizedValue = (locationValue / maxCapacity) * 10;
          } else {
            // Autres: supposer valeur 0-10
            normalizedValue = Math.min(10, locationValue);
          }

          // Inverser si nécessaire
          if (!criterion.reverse) {
            normalizedValue = 10 - normalizedValue;
          }

          // Score pondéré
          const weight = importance / 10; // Normaliser importance 1-10 → 0-1
          const criteriaScore = normalizedValue * weight;

          breakdown[criteriaKey] = {
            value: locationValue,
            normalized: Math.round(normalizedValue * 10) / 10,
            weight: Math.round(weight * 100),
            score: Math.round(criteriaScore * 10) / 10
          };

          totalScore += criteriaScore;
          weightSum += weight;
        }
      });

      // Score final (0-100)
      const finalScore = weightSum > 0 ? (totalScore / weightSum) : 0;

      scores.push({
        location: location,
        index,
        score: Math.round(finalScore * 100) / 100,
        breakdown,
        totalWeight: Math.round(weightSum * 100)
      });
    });

    // Trier par score décroissant
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * TROUVER LE MEILLEUR ITINÉRAIRE
   */
  findBestItinerary(locations, preferences = null) {
    // Utiliser les préférences données ou extraites
    if (preferences) {
      this.userPreferences = preferences;
    }

    if (Object.keys(this.userPreferences).length === 0) {
      console.warn('Aucune préférence trouvée');
      return [];
    }

    // Calculer les scores
    const scoredLocations = this.calculateScores(locations);

    // Retourner les résultats avec explication
    return scoredLocations.map((result, rank) => ({
      rank: rank + 1,
      location: result.location,
      score: result.score,
      percentage: `${Math.round(result.score)}%`,
      breakdown: result.breakdown,
      reasoning: this.generateReasoning(result),
      matches: this.countMatches(result)
    }));
  }

  /**
   * Générer une explication textuelle
   */
  generateReasoning(result) {
    const { location, breakdown } = result;
    const strengths = [];
    const weaknesses = [];

    Object.entries(breakdown).forEach(([key, data]) => {
      const normalized = data.normalized;
      const criteriaName = this.criteria[key].name;

      if (normalized >= 8) {
        strengths.push(`✅ ${criteriaName}: ${normalized}/10`);
      } else if (normalized <= 3) {
        weaknesses.push(`⚠️ ${criteriaName}: ${normalized}/10`);
      }
    });

    return {
      name: location.name,
      strengths,
      weaknesses,
      summary: this.generateSummary(result)
    };
  }

  /**
   * Générer un résumé intelligent
   */
  generateSummary(result) {
    const { location, score, breakdown } = result;
    const topCriteria = Object.entries(breakdown)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 2)
      .map(([key]) => this.criteria[key].name);

    return `${location.name} est le meilleur choix (${score}%) car il excelle en ${topCriteria.join(' et ')}`;
  }

  /**
   * Compter combien de critères sont bien satisfaits
   */
  countMatches(result) {
    let excellent = 0;
    let good = 0;
    let average = 0;
    let poor = 0;

    Object.values(result.breakdown).forEach(data => {
      const normalized = data.normalized;
      if (normalized >= 8) excellent++;
      else if (normalized >= 6) good++;
      else if (normalized >= 4) average++;
      else poor++;
    });

    return { excellent, good, average, poor };
  }

  /**
   * INTERFACE VOCALE INTERACTIVE
   */
  async interactiveItinerary(locations) {
    console.log('🎤 Dites vos préférences d\'itinéraire...');
    
    return new Promise((resolve) => {
      this.onFinalResult = (transcript) => {
        if (transcript.length > 10) {
          this.stopListening();
          
          // Extraire préférences du transcript
          const preferences = this.extractPreferences(transcript);
          console.log('📊 Préférences extraites:', preferences);

          // Trouver le meilleur itinéraire
          const results = this.findBestItinerary(locations, preferences);
          
          resolve({
            transcript,
            preferences,
            results,
            bestOption: results[0]
          });
        }
      };

      this.startListening();
    });
  }

  /**
   * TEXTE → PRÉFÉRENCES (Sans voix)
   */
  parseText(text) {
    const preferences = this.extractPreferences(text);
    return {
      text,
      preferences,
      criteriaCount: Object.keys(preferences).length
    };
  }

  /**
   * Afficher les résultats formatés
   */
  formatResults(results) {
    return results.map((result, index) => ({
      rank: index + 1,
      name: result.location.name,
      matchScore: `${result.score}%`,
      explanation: result.reasoning.summary,
      strengths: result.reasoning.strengths,
      weaknesses: result.reasoning.weaknesses,
      matches: result.matches
    }));
  }

  /**
   * Vocaliser le résultat (TTS - Text To Speech)
   */
  speakResult(text, language = 'ar') {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }

  /**
   * Obtenir statistiques
   */
  getStats() {
    return {
      criteria: Object.keys(this.criteria).length,
      selectedCriteria: Object.keys(this.userPreferences).length,
      averagePreference: Object.values(this.userPreferences).length > 0
        ? Math.round(Object.values(this.userPreferences).reduce((a, b) => a + b, 0) / Object.values(this.userPreferences).length)
        : 0
    };
  }
}

// ════════════════════════════════════════════════════════════════════
// EXEMPLE D'UTILISATION
// ════════════════════════════════════════════════════════════════════

const itineraryAI = new SmartItineraryAI({
  language: 'ar-SA',
  continuous: false,
  interimResults: true
});

// Vos locations avec données
const locations = [
  {
    id: 1,
    name: 'المسجد الأقصى',
    distance: 2.5,    // km
    quality: 9,       // 1-10
    rating: 4.8,      // 1-5
    capacity: 5000,   // personnes
    facilities: 8,    // 1-10
    accessibility: 7,
    atmosphere: 9,
    timing: 8,
    price: 0,         // gratuit = 0
    reviews: 8
  },
  {
    id: 2,
    name: 'جامع الزيتونة',
    distance: 1.2,
    quality: 9,
    rating: 4.9,
    capacity: 3000,
    facilities: 9,
    accessibility: 9,
    atmosphere: 8,
    timing: 9,
    price: 0,
    reviews: 9
  },
  {
    id: 3,
    name: 'مسجد الكبير',
    distance: 0.8,
    quality: 7,
    rating: 4.2,
    capacity: 2000,
    facilities: 6,
    accessibility: 5,
    atmosphere: 7,
    timing: 10,
    price: 0,
    reviews: 6
  }
];

// ════════════════════════════════════════════════════════════════════
// CALLBACKS POUR L'INTERFACE
// ════════════════════════════════════════════════════════════════════

itineraryAI.onListeningStart = () => {
  console.log('🎙️ Microphone activé');
};

itineraryAI.onInterimResult = (interim) => {
  console.log('📝 En cours:', interim);
};

itineraryAI.onFinalResult = (transcript) => {
  console.log('✅ Reconnu:', transcript);
};

itineraryAI.onListeningEnd = () => {
  console.log('✋ Microphone désactivé');
};

itineraryAI.onError = (error) => {
  console.error('⚠️ Erreur:', error);
};

console.log('✅ SmartItineraryAI chargé et prêt!');
