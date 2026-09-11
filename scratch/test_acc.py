import os
import sys
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ml")))
from train_model import load_split

X_train, y_train = load_split("train")
X_val, y_val = load_split("val")

# Logistic Regression
clf_lr = LogisticRegression(C=50.0, max_iter=2000)
clf_lr.fit(X_train, y_train)
acc_lr = accuracy_score(y_val, clf_lr.predict(X_val))
print(f"Logistic Regression Validation Accuracy: {acc_lr * 100:.2f}%")

# MLP Classifier
clf_mlp = MLPClassifier(hidden_layer_sizes=(128, 64), max_iter=500, random_state=42)
clf_mlp.fit(X_train, y_train)
acc_mlp = accuracy_score(y_val, clf_mlp.predict(X_val))
print(f"MLP (128, 64) Validation Accuracy: {acc_mlp * 100:.2f}%")
