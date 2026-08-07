# CartRescue AI Backend

## Setup

1. Install dependencies
   ```bash
   npm install
   ```
2. Create environment file
   ```bash
   cp .env.example .env
   ```
3. Update MongoDB URI and JWT settings.
4. Seed sample data
   ```bash
   node scripts/seed.js
   ```
5. Start the server
   ```bash
   npm run dev
   ```

## API Documentation

Swagger UI is available at:
- http://localhost:5000/api-docs

## AI Dataset Builder

Admin users can generate machine-learning-ready datasets from completed sessions.

### AI dataset endpoints
- POST /api/ai/generate-dataset
- GET /api/ai/datasets
- GET /api/ai/dataset/:id
- DELETE /api/ai/dataset/:id
- POST /api/ai/export

The builder aggregates session, order, cart, product, and user signals to create labeled training rows for abandonment prediction.

## AI Prediction Engine

The prediction engine consumes the engineered datasets and supports training, evaluation, persistence, and inference for cart abandonment forecasting.

### AI prediction endpoints
- POST /api/ai/train
- GET /api/ai/models
- GET /api/ai/models/latest
- POST /api/ai/predict
- POST /api/ai/predict/session/:sessionId
- GET /api/ai/evaluation
- GET /api/ai/history

The engine stores trained model metadata in the trained_models collection and prediction outcomes in the prediction_history collection.

## Postman

Import the collection from:
- postman/CartRescueAI.postman_collection.json

## Notes

- Admin role can manage products.
- Customers can manage carts, sessions, and orders.
