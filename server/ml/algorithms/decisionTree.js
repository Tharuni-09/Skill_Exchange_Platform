/**
 * CART Decision Tree Classifier Algorithm (Classification and Regression Trees)
 * 
 * Mathematical Formulation:
 *   Gini Impurity: Gini(S) = 1 - sum_{c in Classes} (p_c)^2
 *   Split Quality: Delta Gini = Gini(Parent) - (N_L / N_Parent * Gini(Left) + N_R / N_Parent * Gini(Right))
 *   Criterion: argmax_{feature, threshold} (Delta Gini)
 */

export class DecisionTreeClassifier {
  constructor(maxDepth = 5, minSamplesSplit = 2) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.root = null;
    this.classes = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    this.featureNames = [];
    this.featureImportances = {};
    this.accuracy = 0;
  }

  // Calculate Gini impurity for a set of class labels
  giniImpurity(labels) {
    if (!labels || labels.length === 0) return 0;
    const count = labels.length;
    const freq = {};
    for (const l of labels) freq[l] = (freq[l] || 0) + 1;

    let sumSq = 0;
    for (const c of Object.keys(freq)) {
      const p = freq[c] / count;
      sumSq += p * p;
    }
    return 1 - sumSq;
  }

  // Find majority class in labels
  majorityClass(labels) {
    const freq = {};
    for (const l of labels) freq[l] = (freq[l] || 0) + 1;
    let bestClass = this.classes[0];
    let maxCount = -1;
    for (const [c, cnt] of Object.entries(freq)) {
      if (cnt > maxCount) {
        maxCount = cnt;
        bestClass = c;
      }
    }
    return bestClass;
  }

  // Calculate class probabilities for leaf
  classProbabilities(labels) {
    const total = labels.length || 1;
    const probs = {};
    for (const c of this.classes) {
      const count = labels.filter(l => l === c).length;
      probs[c] = Number((count / total).toFixed(3));
    }
    return probs;
  }

  /**
   * Find the optimal split across all features and threshold candidates
   */
  findBestSplit(X, y) {
    const n = X.length;
    const numFeatures = X[0].length;
    const parentGini = this.giniImpurity(y);

    let bestGain = -1;
    let bestFeature = null;
    let bestThreshold = null;
    let bestLeftIndices = null;
    let bestRightIndices = null;

    for (let f = 0; f < numFeatures; f++) {
      // Get unique values sorted
      const values = [...new Set(X.map(row => row[f]))].sort((a, b) => a - b);
      if (values.length <= 1) continue;

      for (let i = 0; i < values.length - 1; i++) {
        const threshold = (values[i] + values[i + 1]) / 2;

        const leftIndices = [];
        const rightIndices = [];
        for (let r = 0; r < n; r++) {
          if (X[r][f] <= threshold) leftIndices.push(r);
          else rightIndices.push(r);
        }

        if (leftIndices.length === 0 || rightIndices.length === 0) continue;

        const leftLabels = leftIndices.map(idx => y[idx]);
        const rightLabels = rightIndices.map(idx => y[idx]);

        const leftGini = this.giniImpurity(leftLabels);
        const rightGini = this.giniImpurity(rightLabels);

        const weightedGini = (leftIndices.length / n) * leftGini + (rightIndices.length / n) * rightGini;
        const gain = parentGini - weightedGini;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
          bestLeftIndices = leftIndices;
          bestRightIndices = rightIndices;
        }
      }
    }

    return {
      bestGain,
      bestFeature,
      bestThreshold,
      bestLeftIndices,
      bestRightIndices
    };
  }

  // Recursive tree builder
  buildTree(X, y, depth = 0) {
    const numSamples = X.length;
    const uniqueLabels = new Set(y);

    // Terminal conditions
    if (
      depth >= this.maxDepth ||
      uniqueLabels.size <= 1 ||
      numSamples < this.minSamplesSplit
    ) {
      return {
        isLeaf: true,
        prediction: this.majorityClass(y),
        probabilities: this.classProbabilities(y),
        samples: numSamples
      };
    }

    const split = this.findBestSplit(X, y);

    // If no meaningful split gain found
    if (split.bestGain <= 1e-5 || !split.bestLeftIndices) {
      return {
        isLeaf: true,
        prediction: this.majorityClass(y),
        probabilities: this.classProbabilities(y),
        samples: numSamples
      };
    }

    // Accumulate feature importance
    const fname = this.featureNames[split.bestFeature] || `feature_${split.bestFeature}`;
    this.featureImportances[fname] = (this.featureImportances[fname] || 0) + split.bestGain * numSamples;

    const leftX = split.bestLeftIndices.map(i => X[i]);
    const leftY = split.bestLeftIndices.map(i => y[i]);
    const rightX = split.bestRightIndices.map(i => X[i]);
    const rightY = split.bestRightIndices.map(i => y[i]);

    return {
      isLeaf: false,
      featureIndex: split.bestFeature,
      featureName: fname,
      threshold: Number(split.bestThreshold.toFixed(2)),
      gain: Number(split.bestGain.toFixed(4)),
      samples: numSamples,
      left: this.buildTree(leftX, leftY, depth + 1),
      right: this.buildTree(rightX, rightY, depth + 1)
    };
  }

  fit(X, y, featureNames = []) {
    this.featureNames = featureNames;
    this.classes = [...new Set(y)];
    this.featureImportances = {};
    for (const f of featureNames) this.featureImportances[f] = 0;

    this.root = this.buildTree(X, y, 0);

    // Normalize feature importances to sum to 100%
    const totalImp = Object.values(this.featureImportances).reduce((a, b) => a + b, 0) || 1;
    for (const k of Object.keys(this.featureImportances)) {
      this.featureImportances[k] = Number(((this.featureImportances[k] / totalImp) * 100).toFixed(1));
    }

    // Compute training accuracy
    const y_pred = this.predict(X);
    let correct = 0;
    for (let i = 0; i < y.length; i++) {
      if (y_pred[i].prediction === y[i]) correct++;
    }
    this.accuracy = Number(((correct / y.length) * 100).toFixed(1));

    return {
      accuracy: `${this.accuracy}%`,
      featureImportances: this.featureImportances,
      maxDepth: this.maxDepth
    };
  }

  // Traverse tree for single sample
  predictSample(x, node = this.root) {
    if (!node || node.isLeaf) {
      return {
        prediction: node ? node.prediction : this.classes[0],
        probabilities: node ? node.probabilities : {},
        samples: node ? node.samples : 0
      };
    }

    if (x[node.featureIndex] <= node.threshold) {
      return this.predictSample(x, node.left);
    } else {
      return this.predictSample(x, node.right);
    }
  }

  predict(X) {
    if (!Array.isArray(X[0])) {
      return this.predictSample(X);
    }
    return X.map(x => this.predictSample(x));
  }

  toJSON() {
    return {
      type: 'DecisionTreeClassifier',
      maxDepth: this.maxDepth,
      classes: this.classes,
      featureNames: this.featureNames,
      featureImportances: this.featureImportances,
      accuracy: this.accuracy,
      tree: this.root
    };
  }

  fromJSON(data) {
    this.maxDepth = data.maxDepth || 5;
    this.classes = data.classes || ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    this.featureNames = data.featureNames || [];
    this.featureImportances = data.featureImportances || {};
    this.accuracy = data.accuracy || 0;
    this.root = data.tree || null;
    return this;
  }
}
