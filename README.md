# Secure Messenger Desktop

A high-performance Electron + React + TypeScript chat application simulating a secure messaging environment. Designed to handle large datasets (20,000+ messages) with instant performance and real-time synchronization.

##  Main Features

- **Blazing Fast**: Uses virtualization (`react-window`) to scroll through thousands of messages and hundreds of chats with zero lag.
- **Real-Time Simulation**: Features an internal message simulator that generates new messages every 1-3 seconds for different participants.
- **Security at Rest**: Simulates "at-rest" encryption by encoding all message bodies before they hit the disk.
- **Smart Search**: Built-in substring search that queries encrypted database records efficiently using custom SQL functions.
- **Connection Health**: Implements a heartbeat mechanism (ping/pong) and exponential backoff for robust server reconnections.
- **Fully Paginated**: Both chats and messages are loaded in chunks (50 at a time) for optimal memory usage.

---

## Getting Started

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**

### Installation
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Database Setup**:
   The application uses SQLite for local data storage. The message database will be automatically created and seeded with sample data when you first run the application.
   - Database location: `<UserData>/messenger.db` (exact path depends on your OS)
   - Initialization: Handled automatically by `src/main/db/seed.ts` on startup.

### Running the App
Start the development server with:
```bash
npm run dev
```
The app will launch in a new window.

---

##  Testing the Features

- **Bidirectional Simulation**: You will see messages arriving from different participants (e.g., Alice and Bob) across various chat rooms.
- **Connection Recovery**: Click the **"Simulate Drop"** button in the top right. The app will transition to "Reconnecting" and recover using an exponential backoff strategy.
- **Pagination**: Scroll to the bottom of the chat list or message list and click "Load More" to fetch historical data from SQLite.
- **Search**: Search for specific keywords in the current chat. Note that the search runs directly on the database using a custom decryption function.

---

##  Architecture & Security

### Data Flow
1. **Main Process**: Acts as the trusted backend. It manages the SQLite database (`better-sqlite3`), runs the background `SyncServer`, and handles IPC requests.
2. **Renderer Process**: The React frontend using Redux Toolkit for state management. It communicates with the Main process via a secure `preload.js` gateway.

### Database Schema & Optimization
The SQLite database is optimized for performance with the following indexes:
- **`idx_messages_chatId_ts`**: Composite index on `chatId` and `ts` (descending). This allows for lightning-fast retrieval of message history for a specific chat, supporting pagination (OFFSET/LIMIT) without full table scans.
- **`idx_chats_lastMessageAt`**: Index on `lastMessageAt` (descending). This ensures the chat list is always sorted by the most recent activity instantly, even with thousands of chats.

### Security Hygiene & Encryption
- **Module Boundary**: All sensitive operations are isolated in `SecurityService.ts`.
- **Encryption Logic**: In a production system, `encrypt()` would use AES-256-GCM with keys stored in the system's native keychain (e.g., `keytar`). Decryption would happen in the Main process just before sending results to the Renderer.
- **Leak Prevention**: 
  - **Logs**: We use `SecurityService.sanitizeForLog` to wrap all IPC handlers, ensuring clear-text message bodies never reach `STDOUT` or file logs.
  - **Memory/Dumps**: We would use sensitive data buffers that are cleared immediately after use to prevent sensitive information from appearing in memory dumps or crash reports.

---

##  Trade-offs & Improvements

### Decisions
- **Redux Toolkit**: Chosen for its robust state management and built-in support for immutable updates, which is critical for complex chat state transitions.
- **better-sqlite3**: Selected over `sql.js` for significantly better performance in desktop environments where filesystem access is available.

### Future Improvements
- **SQLCipher**: Integrate SQLCipher to provide full database-level encryption at rest.
- **E2EE**: Implement Signal Protocol for actual end-to-end encryption.
- **Tests**: Expand the current unit test suite (see `chat.test.ts`) to include more complex integration tests for the WebSocket state machine.
