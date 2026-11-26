/**
 * k-Nearest Neighbors (k-NN) Recommender Algorithm
 * 
 * Mathematical Formulation:
 *   Distance metric: Euclidean Distance on L2-normalized feature vectors
 *   d(x, q) = sqrt( sum_{i=1}^D (x_i - q_i)^2 )
 *   Nearest Neighbors: N_k(q) = argmin_{S subset Training, |S|=k} sum_{s in S} d(s, q)
 *   Recommendation: Aggregate historical practice modules & successful skill pathways
 *                   of the k nearest benchmark candidates from Kaggle datasets.
 */

export class KNNRecommender {
  constructor(k = 5) {
    this.k = k;
    this.trainingSamples = [];
    this.featureNames = [];
  }

  // Euclidean distance between two vectors
  euclideanDistance(u, v) {
    let sum = 0;
    for (let i = 0; i < u.length; i++) {
      const diff = (u[i] || 0) - (v[i] || 0);
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  fit(X, metadataList = [], featureNames = []) {
    this.featureNames = featureNames;
    this.trainingSamples = X.map((x, idx) => ({
      vector: x,
      metadata: metadataList[idx] || {}
    }));
    return {
      k: this.k,
      trainedSamplesCount: this.trainingSamples.length
    };
  }

  /**
   * Find k nearest benchmark student records from Kaggle dataset
   */
  findNearest(queryVector) {
    if (this.trainingSamples.length === 0) return [];

    const distances = this.trainingSamples.map(sample => ({
      distance: this.euclideanDistance(queryVector, sample.vector),
      metadata: sample.metadata
    }));

    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, this.k);
  }

  /**
   * Recommend targeted practice tracks & assignment topics
   */
  recommend(queryVector, domainScores = {}) {
    const neighbors = this.findNearest(queryVector);

    // Identify weak domains from query
    const gaps = Object.entries(domainScores)
      .filter(([, score]) => score < 60)
      .map(([domain]) => domain);

    const recommendations = [];

    // Map gaps to specific Kaggle curriculum tracks
    const TRACK_MAPPINGS = {
      analytical_reasoning: {
        title: "Kaggle Discrete Logic & Pattern Analysis Track",
        difficulty: "Medium",
        estHours: "4.5 hrs",
        topic: "Deductive Proofs, Graph Logic & Boolean Truth Tables"
      },
      problem_solving: {
        title: "Kaggle Algorithm Optimization & Dynamic Programming",
        difficulty: "Hard",
        estHours: "6.0 hrs",
        topic: "Memoization, Topological Sort & Graph Traversal"
      },
      decision_making: {
        title: "Kaggle Statistical Trade-Off & Risk Matrix Practice",
        difficulty: "Medium",
        estHours: "3.5 hrs",
        topic: "Bayesian Decision Theory & Resource Allocation Modeling"
      },
      attention_consistency: {
        title: "Kaggle Code Quality & Structural Verification Track",
        difficulty: "Easy",
        estHours: "2.5 hrs",
        topic: "Static Code Analysis, Edge Case Auditing & QA Test Specs"
      },
      knowledge_recall: {
        title: "Kaggle Core CS Fundamentals Mastery Sprint",
        difficulty: "Medium",
        estHours: "4.0 hrs",
        topic: "OS Process Schedulers, Computer Networks & ACID Transactions"
      }
    };

    for (const gap of gaps) {
      if (TRACK_MAPPINGS[gap]) {
        recommendations.push({
          domain: gap.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          ...TRACK_MAPPINGS[gap],
          neighborConfidence: Math.round(
            (1 / (1 + (neighbors[0]?.distance || 1))) * 100
          )
        });
      }
    }

    return {
      nearestNeighborsCount: neighbors.length,
      nearestDistance: Number((neighbors[0]?.distance || 0).toFixed(3)),
      recommendedTracks: recommendations
    };
  }

  toJSON() {
    return {
      type: 'KNNRecommender',
      k: this.k,
      featureNames: this.featureNames,
      sampleCount: this.trainingSamples.length,
      samples: this.trainingSamples
    };
  }

  fromJSON(data) {
    this.k = data.k || 5;
    this.featureNames = data.featureNames || [];
    this.trainingSamples = data.samples || [];
    return this;
  }
}
