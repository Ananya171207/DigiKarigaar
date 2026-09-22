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
```
---

##  Product Data Schema

| Field | Type | Description |
|---|---|---|
| `product_id` | String / UUID | Unique identifier for each product |
| `artisan_id` | String / UUID | Unique reference to the creator's profile |
| `title` | String | Product name in the chosen language |
| `description` | Text | Detailed description of craft, history, and usage |
| `category` | String | Craft classification (e.g., Pottery, Handloom, Woodwork) |
| `material` | String | Primary raw material used (e.g., Terracotta, Mulberry Silk) |
| `raw_image_url` | String | Storage path/URL for the original captured photograph |
| `enhanced_image_url` | String | Processed, market-ready image path |
| `predicted_price` | Float | Fair value estimate generated by the Random Forest model |
| `artisan_price` | Float | Final selling price decided by the artisan |
| `language` | String | Locale identifier (`hi`, `bn`, `ta`, `en`) |
| `status` | Enum | Sync/listing lifecycle state: `draft` \| `listed` \| `synced` |
| `created_at` | Timestamp | Initial local record creation time |
| `updated_at` | Timestamp | Last record update or synchronization timestamp |

---

##  Getting Started

### Prerequisites
- Python 3.9 or higher
- Git

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Ananya171207/DigiKarigaar.git](https://github.com/Ananya171207/DigiKarigaar.git)
   cd DigiKarigaar

2. **Create and activate a virtual environment:**
   ```bash
   # On macOS/Linux:
   python3 -m venv venv
   source venv/bin/activate

   # On Windows:
   python -m venv venv
   venv\Scripts\activate

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt

4. **Run the application:**
    ```bash
   python app.py
   Open your browser and visit http://127.0.0.1:5000/.

---

## Roadmap
[ ] Voice-First Navigation: Integrate regional speech-to-text input to assist non-literate artisans with product listings.

[ ] Direct ONDC Integration: Implement Beckn protocol adapters for native digital commerce publishing.

[ ] PWA Offline Service Workers: Full asset and local database caching for complete browser-based offline usage.

[ ] AI Background Cleanup: Automated edge-detection and studio background removal for mobile-captured product photos.

[ ] Automated Subsidy Prefill: Expand scheme coverage to auto-populate state-level artisan grants.

---

##  Contributors

A big thank you to all the contributors who have helped build DigiKarigaar!

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/Ishikasingh2906">
        <img src="https://github.com/Ishikasingh2906.png" width="80px;" alt="Ishikasingh2906"/><br />
        <sub><b>Ishika Singh</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/vanshika15manchanda">
        <img src="https://github.com/vanshika15manchanda.png" width="80px;" alt="vanshika15manchanda"/><br />
        <sub><b>Vanshika Manchanda</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/vijayajaiswal398-commits">
        <img src="https://github.com/vijayajaiswal398-commits.png" width="80px;" alt="vijayajaiswal398-commits"/><br />
        <sub><b>Vijaya Jaiswal</b></sub>
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://github.com/Ananya171207">
        <img src="https://github.com/Ananya171207.png" width="80px;" alt="Ananya171207"/><br />
        <sub><b>Ananya</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/shaivis08">
        <img src="https://github.com/shaivis08.png" width="80px;" alt="shaivis08"/><br />
        <sub><b>Shaivi</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/ananya078btaiml25-ops">
        <img src="https://github.com/ananya078btaiml25-ops.png" width="80px;" alt="ananya078btaiml25-ops"/><br />
        <sub><b>Ananya</b></sub>
      </a>
    </td>
  </tr>
</table>
