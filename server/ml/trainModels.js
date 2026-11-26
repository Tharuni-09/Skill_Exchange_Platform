/**
 * Model Training Pipeline for SkillSwap Machine Learning Engine
 * 
 * Uses benchmark datasets from Kaggle:
 * 1. sps/students-performance-in-exams
 * 2. aljarah/higher-education-students-performance-evaluation
 * 3. cognitive-assessment-benchmark
 * 
 * Algorithms trained:
 * - Ridge Regression (Continuous score estimation)
 * - CART Decision Tree Classifier (Discrete level classification)
 * - Softmax Logistic Classifier (Class probability distribution)
 * - k-Nearest Neighbors (KNN, k=5) (Peer track recommendation)
 */

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { RidgeRegression } from './algorithms/linearRegression.js';
import { DecisionTreeClassifier } from './algorithms/decisionTree.js';
import { SoftmaxClassifier } from './algorithms/logisticClassifier.js';
import { KNNRecommender } from './algorithms/knnRecommender.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function trainAndSaveModels() {
  console.log("==================================================================");
  console.log("🚀 Training Machine Learning Assessment Models on Kaggle Datasets");
  console.log("==================================================================");

  // 1. Load Kaggle Datasets
  const recordsPath = path.join(__dirname, '../data/kaggle/kaggle_student_assessment_records.json');
  const registryPath = path.join(__dirname, '../data/kaggle/kaggle_datasets_registry.json');

  const { records } = JSON.parse(readFileSync(recordsPath, 'utf-8'));
  const registry = JSON.parse(readFileSync(registryPath, 'utf-8'));

  console.log(`Loaded ${records.length} Kaggle student benchmark records.`);
  console.log(`Datasets used:`);
  registry.datasets.forEach((d, idx) => console.log(`  [${idx + 1}] ${d.name} (${d.source})`));

  // 2. Prepare Features & Targets
  const featureNames = [
    'analytical_reasoning',
    'problem_solving',
    'decision_making',
    'attention_consistency',
    'knowledge_recall',
    'streak_consistency'
  ];

  const X = records.map(r => [
    r.analytical / 100,
    r.problem_solving / 100,
    r.decision / 100,
    r.attention / 100,
    r.knowledge / 100,
    Math.min(1.0, (r.streak || 1) / 30)
  ]);

  const y_regression = records.map(r => r.overall);
  const y_classification = records.map(r => r.level);

  // 3. Train Ridge Regression Model
  console.log("\n[1/4] Fitting Ridge Regression Model (lambda = 0.01)...");
  const regressor = new RidgeRegression(0.01);
  const regMetrics = regressor.fit(X, y_regression, featureNames);
  console.log(`  ✓ R² Score: ${regMetrics.r2Score}`);
  console.log(`  ✓ Mean Squared Error (MSE): ${regMetrics.mse}`);
  console.log(`  ✓ Mean Absolute Error (MAE): ${regMetrics.mae}`);
  console.log(`  ✓ Learned Bias: ${regMetrics.bias.toFixed(3)}`);

  // 4. Train CART Decision Tree Classifier
  console.log("\n[2/4] Fitting CART Decision Tree (Gini Impurity, maxDepth = 5)...");
  const treeClassifier = new DecisionTreeClassifier(5, 2);
  const treeMetrics = treeClassifier.fit(X, y_classification, featureNames);
  console.log(`  ✓ Training Accuracy: ${treeMetrics.accuracy}`);
  console.log(`  ✓ Feature Importances:`, treeMetrics.featureImportances);

  // 5. Train Softmax Logistic Classifier
  console.log("\n[3/4] Fitting Multi-Class Softmax Classifier (SGD, 250 epochs)...");
  const softmaxClassifier = new SoftmaxClassifier(0.08, 250);
  const softmaxMetrics = softmaxClassifier.fit(X, y_classification, featureNames);
  console.log(`  ✓ Softmax Classification Accuracy: ${softmaxMetrics.accuracy}`);

  // 6. Train KNN Recommender
  console.log("\n[4/4] Indexing k-Nearest Neighbors Benchmark Graph (k = 5)...");
  const knn = new KNNRecommender(5);
  const knnMetrics = knn.fit(X, records, featureNames);
  console.log(`  ✓ Indexed ${knnMetrics.trainedSamplesCount} student profiles for k-NN recommendation.`);

  // 7. Compile Artifact
  const trainedArtifact = {
    trainedAt: new Date().toISOString(),
    version: "2.4.0-kaggle-trained",
    datasetsUsed: registry.datasets,
    algorithmsSummary: [
      {
        name: "Ridge Regression",
        type: "Linear / Continuous Estimation",
        r2Score: regMetrics.r2Score,
        mse: regMetrics.mse,
        mae: regMetrics.mae,
        bias: regMetrics.bias,
        weights: regMetrics.weights
      },
      {
        name: "CART Decision Tree Classifier",
        type: "Non-Linear Decision Tree",
        accuracy: treeMetrics.accuracy,
        featureImportances: treeMetrics.featureImportances
      },
      {
        name: "Softmax Multi-Class Classifier",
        type: "Probabilistic Categorization",
        accuracy: softmaxMetrics.accuracy
      },
      {
        name: "k-Nearest Neighbors (k=5)",
        type: "Instance-Based Assignment Recommendation",
        sampleSize: knnMetrics.trainedSamplesCount
      }
    ],
    models: {
      regression: regressor.toJSON(),
      decisionTree: treeClassifier.toJSON(),
      softmax: softmaxClassifier.toJSON(),
      knn: knn.toJSON()
    }
  };

  const outputPath = path.join(__dirname, 'trained_models.json');
  writeFileSync(outputPath, JSON.stringify(trainedArtifact, null, 2), 'utf-8');
  console.log(`\n✅ Saved serialized trained models to: ${outputPath}`);
  console.log("==================================================================\n");

  return trainedArtifact;
}

// Allow direct CLI execution: node server/ml/trainModels.js
if (process.argv[1] && process.argv[1].endsWith('trainModels.js')) {
  trainAndSaveModels();
}
