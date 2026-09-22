#  DigiKarigaar (डिजीकारीगर)

> **Empowering grassroots artisans to digitize, price smartly, access subsidies, and scale to global marketplaces—even without internet.**

[![Python](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](https://www.python.org/)
[![Framework](https://img.shields.io/badge/Backend-Flask-lightgrey.svg)](https://flask.palletsprojects.com/)
[![Machine Learning](https://img.shields.io/badge/Model-Random%20Forest%20Regressor-brightgreen.svg)](#machine-learning--pricing)
[![Architecture](https://img.shields.io/badge/Design-Offline--First-orange.svg)](#offline-first-architecture)


---

##  Problem Overview

India's traditional artisanal ecosystem supports millions of livelihoods, yet artisans face critical structural barriers:
- **Digital Literacy & Language Gaps:** Most e-commerce interfaces are English-centric and unintuitive for regional creators.
- **Intermediary Exploitation:** Artisans receive a fraction of product value due to local middlemen and brokers.
- **Unreliable Connectivity:** Rural production clusters suffer from intermittent connectivity, making cloud-only portals unusable.
- **Complex Subsidy Navigation:** Formidable procedures prevent artisans from obtaining schemes like PM Vishwakarma and Mudra loans.
- **Suboptimal Cataloging:** Poor image quality and guesswork pricing hurt online conversion rates.

**DigiKarigaar** solves these problems with a localized, offline-first digital companion that handles catalog creation, automated image enhancement, Fair-Price ML estimation, and simplified government scheme onboarding.

---

##  Key Features

### 1.  Offline-First Architecture & Sync Engine
- Works seamlessly in zero-connectivity areas.
- Allows artisans to draft listings, update inventory, and stage form data locally.
- Automatic background sync when network connectivity is detected.

### 2.  ML-Powered Fair Price Prediction
- Integrated **Random Forest Regressor** trained on material quality, crafting hours, product categories, and regional demand.
- Provides a recommended pricing bracket to prevent underpricing and eliminate intermediary bargaining.

### 3.  Automated Product Image Enhancement
- Transforms raw mobile photos into marketplace-ready visuals.
- Handles brightness/contrast balancing, color enhancement, and background cleanup suited for e-commerce listings.

### 4.  Guided Government Scheme & Subsidy Assistance
- Provides simplified, regional-language walkthroughs for welfare and credit schemes (e.g., PM Vishwakarma, PMEGP).
- **Assisted Onboarding:** Auto-populates applicant data into structured form templates while safely reserving OTP verifications, CAPTCHAs, and legal submissions for the artisan on official portals.

### 5.  Regional & Multilingual Accessibility
- Interface localization tailored for artisans across multiple languages: **Hindi (हिन्दी)**, **Bengali (বাংলা)**, **Tamil (தமிழ்)**, and **English**.

### 6.  Inventory & B2B Pipeline Support
- Track items across lifecycle stages (`draft`, `listed`, `synced`).
- Designed with schema compatibility for open digital commerce networks (**ONDC**) and seller programs (**Amazon Karigar**, **Flipkart Samarth**).

---

##  System Architecture

```text
       ┌────────────────────────────────────────────────────────┐
       │                 Artisan Client UI                      │
       │   (Mobile / Responsive Web - Offline Local Storage)    │
       └───────────────────────────┬────────────────────────────┘
                                   │  (Sync Engine)
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                   Flask Core Backend                   │
       ├────────────────────────────────────────────────────────┤
       │  • /api/products       -> Catalog & Inventory Module   │
       │  • /api/enhance        -> Image Enhancement Pipeline   │
       │  • /api/price-predict  -> Random Forest Model Engine   │
       │  • /api/subsidies      -> Scheme Guidance & Form Assist│
       │  • /api/sync           -> Offline-to-Cloud Batch Sync  │
       └───────────────────────────┬────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
     ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
     │  SQLite / PG    │  │ ML Model Assets │  │ Marketplaces    │
     │  Product Data   │  │  (.pkl / .joblib)│  │ (ONDC/Karigar)  │
     └─────────────────┘  └─────────────────┘  └─────────────────┘
