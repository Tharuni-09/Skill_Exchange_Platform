/**
 * Multi-Class Softmax / Logistic Regression Classifier
 * 
 * Mathematical Formulation:
 *   Linear logits: z_k = w_k^T * x + b_k  for each class k in {Beginner, Intermediate, Advanced, Expert}
 *   Softmax: P(y = k | x) = exp(z_k) / sum_{j=1}^K exp(z_j)
 *   Cross-Entropy Loss: L = - 1/N * sum_{i=1}^N sum_{k=1}^K y_{ik} * log(P(y_i = k | x_i))
 */

export class SoftmaxClassifier {
  constructor(learningRate = 0.05, epochs = 200) {
    this.lr = learningRate;
    this.epochs = epochs;
    this.classes = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    this.weights = {}; // class -> [weights]
    this.biases = {};  // class -> bias
    this.featureNames = [];
    this.accuracy = 0;
  }

  softmax(logits) {
    const maxLogit = Math.max(...logits);
    const exps = logits.map(z => Math.exp(z - maxLogit)); // stable softmax
    const sumExps = exps.reduce((a, b) => a + b, 0) || 1;
    return exps.map(e => e / sumExps);
  }

  fit(X, y, featureNames = []) {
    this.featureNames = featureNames;
    const n = X.length;
    const numFeatures = X[0].length;
    this.classes = [...new Set(y)];

    // Initialize weights and biases
    for (const c of this.classes) {
      this.weights[c] = Array.from({ length: numFeatures }, () => (Math.random() - 0.5) * 0.1);
      this.biases[c] = 0;
    }

    // Mini-batch / Stochastic Gradient Descent
    for (let epoch = 0; epoch < this.epochs; epoch++) {
      for (let i = 0; i < n; i++) {
        const x = X[i];
        const trueClass = y[i];

        // Compute logits
        const logits = this.classes.map(c => {
          let z = this.biases[c];
          for (let f = 0; f < numFeatures; f++) {
            z += this.weights[c][f] * x[f];
          }
          return z;
        });

        // Compute probabilities via Softmax
        const probs = this.softmax(logits);

        // Gradient update: grad_w = (p_k - y_k) * x
        for (let k = 0; k < this.classes.length; k++) {
          const c = this.classes[k];
          const target = (c === trueClass) ? 1 : 0;
          const error = probs[k] - target;

          for (let f = 0; f < numFeatures; f++) {
            this.weights[c][f] -= this.lr * error * x[f];
          }
          this.biases[c] -= this.lr * error;
        }
      }
    }

    // Evaluate accuracy
    let correct = 0;
    for (let i = 0; i < n; i++) {
      const pred = this.predictSample(X[i]);
      if (pred.predictedClass === y[i]) correct++;
    }
    this.accuracy = Number(((correct / n) * 100).toFixed(1));

    return {
      accuracy: `${this.accuracy}%`,
      classes: this.classes
    };
  }

  predictSample(x) {
    const logits = this.classes.map(c => {
      let z = this.biases[c] || 0;
      const w = this.weights[c] || [];
      for (let f = 0; f < x.length; f++) {
        z += (w[f] || 0) * x[f];
      }
      return z;
    });

    const probs = this.softmax(logits);
    let bestIdx = 0;
    let maxP = -1;
    const probMap = {};

    for (let k = 0; k < this.classes.length; k++) {
      const c = this.classes[k];
      const p = Number(probs[k].toFixed(3));
      probMap[c] = p;
      if (p > maxP) {
        maxP = p;
        bestIdx = k;
      }
    }

    return {
      predictedClass: this.classes[bestIdx],
      confidence: Math.round(maxP * 100),
      probabilities: probMap
    };
  }

  predict(X) {
    if (!Array.isArray(X[0])) return this.predictSample(X);
    return X.map(x => this.predictSample(x));
  }

  toJSON() {
    return {
      type: 'SoftmaxClassifier',
      classes: this.classes,
      weights: this.weights,
      biases: this.biases,
      featureNames: this.featureNames,
      accuracy: this.accuracy
    };
  }

  fromJSON(data) {
    this.classes = data.classes || [];
    this.weights = data.weights || {};
    this.biases = data.biases || {};
    this.featureNames = data.featureNames || [];
    this.accuracy = data.accuracy || 0;
    return this;
  }
}
