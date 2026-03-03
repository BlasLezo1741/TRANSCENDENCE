# Game Statistics & History — Module Documentation

## Overview

This module manages the persistence, processing, and visualization of competitive data within the **Transcendence** platform.

It is designed to provide users with detailed tracking of their **Pong** performance, ranging from basic metrics (wins/losses/ratios) to a granular match history and a global ranking system. The architecture integrates the Game Engine with a **PostgreSQL** database and exposes data through both a REST API for the Frontend and direct SQL queries for advanced visualization in **Grafana**.

---

## Evaluation Justification: Game Statistics Module

This document serves as the technical evidence for the Minor Module: **"Game statistics and match history"**.
It fully complies with the subject requirements through a dedicated interface located at `/profile/stats`, featuring three distinct visualization modes:

* **Track user game statistics:**
    * Automatic calculation of **Wins**, **Losses**, and **User Level** after every match.
    * Instant visualization via the **"My Stats"** section.
* **Display match history:**
    * Immutable log of all 1v1 matches (Date, Opponent, Score, Result).
    * Accessible via the **"Match History"** button.
* **Leaderboard integration:**
    * Dynamic ranking system sorting players by victories and ladder level.
    * Accessible via the **"Top 10 Global"** button.
* **Advanced Visualization (Grafana Integration):**
    * Direct integration with the `Transcendence_db_pong.json` dashboard.
    * Accessible via the **"Advanced Dashboard"** button for deep-dive analytics.

---

## Architecture Position

The statistical data flow traverses the entire infrastructure, ensuring data consistency between the Game Engine and the User Interface.

```mermaid
graph LR
    subgraph Game_Engine
    Pong[Pong Game Session] -- 1. Game Over (Final Score) --> Backend
    end

    subgraph Backend_Services
    Backend[NestJS API] -- 2. Update Stats & History --> DB[(PostgreSQL)]
    end

    subgraph Visualization
    DB -- 3. Fetch Leaderboard/History --> React[React Frontend]
    DB -- 4. SQL Queries --> Grafana[Grafana Dashboard]
    end

    React -- User Interface (Stats/History) --> User
    Grafana -- Deep Analytics --> User

---

## Features & Functionality

The User Interface centralizes information in the **Stats** section, divided into three key interactive components:

### 1. Global Leaderboard (Top 10)
Displays the platform's competitive hierarchy.
* **Logic:** SQL query sorting users by `wins DESC` and `level DESC`.
* **Data Displayed:** Rank Position, Avatar, Username, Level, and Win Ratio.

### 2. Match History & Personal Stats
Allows users to review their competitive journey.
* **User Stats:** Summary card displaying *Total Games Played*, *Win Rate %*, and *Current Streak*.
* **Match Log:** Chronological list of the last 20 matches.
    * *Format:* `[Date] vs [Opponent Name] | Score: [5 - 3] | [WIN/LOSS]`

### 3. Advanced Dashboard (Grafana)
A direct link to the specialized **Pong Database Dashboard**. Unlike the standard UI, this view leverages Grafana to visualize:
* Global server activity (Games per hour/day).
* Win/Loss distribution charts.
* Time-series analysis of player activity.

---

## Technical Implementation

### Database Schema (PostgreSQL)

Data is structured into two main relational tables optimized for quick retrieval:

**Table: `users` (Stats Columns)**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    ladder_level INTEGER DEFAULT 1,
    ...
);
```

**Table: `games` (Match History)**
```sql
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    player1_id INTEGER REFERENCES users(id),
    player2_id INTEGER REFERENCES users(id),
    score_p1 INTEGER NOT NULL,
    score_p2 INTEGER NOT NULL,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Integration

The Frontend consumes this data via protected REST endpoints:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/stats/leaderboard` | Returns the top 10 users sorted by performance. |
| `GET` | `/stats/history/:id` | Returns the list of match records for a specific user. |
| `GET` | `/stats/summary/:id` | Returns the aggregated object (wins, losses, level). |

---

## How to Verify (Evaluation Guide)

Steps for the evaluator to verify this module:

1.  **Play a Match:**
    * Launch a Pong game (local or remote) and finish it (e.g., win 5-0).
2.  **Verify Persistence:**
    * Navigate to `Profile` -> `Stats`.
    * Click on **"Match History"**. Verify the game you just played appears with the correct timestamp and score.
3.  **Verify Ranking:**
    * Click on **"Top 10 Global"**. Check if the user's stats have updated relative to other players.
4.  **Verify Grafana Integration:**
    * Click on the **"Advanced Dashboard"** button.
    * Ensure it opens the Grafana interface showing the **PostgreSQL** dashboard (not the GitHub one), visualizing the game data stored in the database.

    [Back to Profile Documentation](./PROFILE_DOCUMENTATION.mdREADME.md#modules)
    
    [Return to Main modules table](../../../README.md#modules)