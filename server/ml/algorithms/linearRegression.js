/**
 * Multi-variable Ridge & Linear Regression Algorithm
 * 
 * Mathematical Formulation:
 *   y_hat = X * w + b
 *   Objective: min ||X*w - y||^2 + lambda * ||w||^2
 *   Normal Equation with L2 regularization (Ridge):
 *   w = (X^T * X + lambda * I)^(-1) * X^T * y
 */

export class RidgeRegression {
  constructor(lambda = 0.01) {
    this.lambda = lambda;
    this.weights = [];
    this.bias = 0;
    this.featureNames = [];
    this.r2Score = 0;
    this.mse = 0;
    this.mae = 0;
  }

  // Matrix Transpose
  transpose(A) {
    const rows = A.length, cols = A[0].length;
    const AT = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        AT[j][i] = A[i][j];
      }
    }
    return AT;
  }

  // Matrix Multiplication
  matmul(A, B) {
    const rowsA = A.length, colsA = A[0].length;
    const rowsB = B.length, colsB = B[0].length;
    if (colsA !== rowsB) throw new Error("Matrix dimensions mismatch in matmul");

    const C = Array.from({ length: rowsA }, () => Array(colsB).fill(0));
    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < colsB; j++) {
        let sum = 0;
        for (let k = 0; k < colsA; k++) {
          sum += A[i][k] * B[k][j];
        }
        C[i][j] = sum;
      }
    }
    return C;
  }

  // Matrix Inversion using Gauss-Jordan elimination
  invert(A) {
    const n = A.length;
    const M = A.map((row, i) => [
      ...row,
      ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    ]);

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
      }
      [M[i], M[maxRow]] = [M[maxRow], M[i]];

      const pivot = M[i][i];
      if (Math.abs(pivot) < 1e-12) {
        // Singular matrix guard: add tiny perturbation
        M[i][i] += 1e-6;
      }

      const invPivot = 1 / M[i][i];
      for (let j = 0; j < 2 * n; j++) {
        M[i][j] *= invPivot;
      }

      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = M[k][i];
          for (let j = 0; j < 2 * n; j++) {
            M[k][j] -= factor * M[i][j];
          }
        }
      }
    }

    return M.map(row => row.slice(n));
  }

  /**
   * Train regression model on feature matrix X and target array y
   * @param {Array<Array<number>>} X - [numSamples x numFeatures]
   * @param {Array<number>} y - [numSamples]
   * @param {Array<string>} featureNames
   */
  fit(X, y, featureNames = []) {
    this.featureNames = featureNames;
    const n = X.length;
    const d = X[0].length;

    // Add bias column of 1s to X
    const X_augmented = X.map(row => [1, ...row]);

    // Compute (X^T * X + lambda * I)
    const XT = this.transpose(X_augmented);
    const XTX = this.matmul(XT, X_augmented);

    // Regularization (leave bias unregularized)
    for (let i = 1; i <= d; i++) {
      XTX[i][i] += this.lambda;
    }

    // Invert
    const XTX_inv = this.invert(XTX);

    // X^T * y
    const yCol = y.map(v => [v]);
    const XTy = this.matmul(XT, yCol);

    // weights = (X^T * X + lambda * I)^(-1) * X^T * y
    const beta = this.matmul(XTX_inv, XTy);

    this.bias = beta[0][0];
    this.weights = beta.slice(1).map(b => b[0]);

    // Calculate metrics: R2, MSE, MAE
    const y_pred = this.predict(X);
    const y_mean = y.reduce((a, b) => a + b, 0) / n;

    let ss_tot = 0;
    let ss_res = 0;
    let abs_err = 0;

    for (let i = 0; i < n; i++) {
      ss_tot += Math.pow(y[i] - y_mean, 2);
      ss_res += Math.pow(y[i] - y_pred[i], 2);
      abs_err += Math.abs(y[i] - y_pred[i]);
    }

    this.r2Score = Number((1 - ss_res / (ss_tot || 1)).toFixed(4));
    this.mse = Number((ss_res / n).toFixed(2));
    this.mae = Number((abs_err / n).toFixed(2));

    return {
      r2Score: this.r2Score,
      mse: this.mse,
      mae: this.mae,
      weights: this.weights,
      bias: this.bias
    };
  }

  /**
   * Predict continuous target for single or multiple feature vectors
   */
  predict(X) {
    if (!Array.isArray(X[0])) {
      // Single vector
      let val = this.bias;
      for (let j = 0; j < X.length; j++) {
        val += (this.weights[j] || 0) * X[j];
      }
      return Math.max(0, Math.min(100, Math.round(val)));
    }

    // Array of vectors
    return X.map(row => {
      let val = this.bias;
      for (let j = 0; j < row.length; j++) {
        val += (this.weights[j] || 0) * row[j];
      }
      return Math.max(0, Math.min(100, Math.round(val)));
    });
  }

  toJSON() {
    return {
      type: 'RidgeRegression',
      lambda: this.lambda,
      weights: this.weights,
      bias: this.bias,
      featureNames: this.featureNames,
      r2Score: this.r2Score,
      mse: this.mse,
      mae: this.mae
    };
  }

  fromJSON(data) {
    this.lambda = data.lambda || 0.01;
    this.weights = data.weights || [];
    this.bias = data.bias || 0;
    this.featureNames = data.featureNames || [];
    this.r2Score = data.r2Score || 0;
    this.mse = data.mse || 0;
    this.mae = data.mae || 0;
    return this;
  }
}
