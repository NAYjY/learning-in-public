### Task Breakdown

#### **Dev: Build and Implement**
1. **Create a New Database Table:**
   - Name the table `onboarding_milestones`.
   - Columns: 
     - `id` (Primary Key, UUID, auto-generated)
     - `user_id` (Foreign Key referencing the `users` table)
     - `milestone` (Enum: `account_created`, `first_project_created`, `first_product_pinned`, `first_share`)
     - `timestamp` (Timestamp, server-generated)
   - Add necessary indexes (e.g., on `user_id` and `milestone` for faster lookups).

2. **Update API Routes (Add Logging Mechanism):**
   - **Account Creation:**
     - Modify the `invite/accept-invite` and `auth/login` APIs to log an `account_created` event in the `onboarding_milestones` table when a user successfully creates their account.
   - **First Project Board Created:**
     - Modify or hook into the project creation logic in the `projects` API to log a `first_project_created` event in the table (only if it’s the user’s first project).
   - **First Product Pinned:**
     - Modify or hook into the logic for adding products to projects (pinning a product) to log a `first_product_pinned` event in the table (only if it’s their first pinned product).
   - **First Share:**
     - Add a tracking mechanism for a future "share" API, ensuring it logs `first_share` in the table.

3. **Build a Helper Function:**
   - Create a reusable helper function called `logMilestone(userId: string, milestone: 'account_created' | 'first_project_created' | 'first_product_pinned' | 'first_share')`:
     - Responsible for inserting records into the `onboarding_milestones` table.
     - Use this helper function in the relevant workflows mentioned above.

4. **Update Seed Data Scripts:**
   - Ensure the development seed script can populate default data for testing `onboarding_milestones`.

---

#### **Test & QA: What to Test**
1. **Database Schema Validation:**
   - Verify the `onboarding_milestones` table is created with the correct schema (columns, data types, constraints, and indexes).

2. **API Logging Tests:**
   - Verify that an `account_created` milestone is logged when a user accepts an invite or registers.
   - Verify that a `first_project_created` milestone is logged only when a user's first project is created (subsequent projects should not trigger a log).
   - Verify that a `first_product_pinned` milestone is logged only when a user pins their first product (subsequent pins should not trigger a log).
   - Verify that `first_share` logging is functional (via mock or simulated API call).

3. **Helper Function Tests:**
   - Test the `logMilestone` function for correctness, including insertion of valid milestones and failure for invalid inputs (non-existent users, invalid milestone types, etc.).

4. **Edge Cases:**
   - Ensure the milestones are not double-logged if the user performs the same action multiple times (e.g., creating multiple boards or pinning multiple products).

5. **Performance Test:**
   - Measure the impact of milestone logging on overall API performance to ensure minimal impact.

---

#### **Code Review: What to Focus On**
1. **Coding Standards & Best Practices:**
   - Verify SQL queries for performance (e.g., indexes) and valid syntax.
   - Ensure clean, reusable code for helper functions and API updates.

2. **Error Handling:**
   - Ensure the code gracefully handles edge cases (e.g., invalid user IDs, unhandled exceptions).
   - Verify logging doesn’t break core app functionality.

3. **Milestone Consistency:**
   - Confirm that each milestone is being logged properly and only once per user as required.
   - Validate that the logic to detect "first" events (e.g., first project, first pin, etc.) is correctly implemented.

4. **Scope Check:**
   - Ensure no breaking changes to existing project functionality (e.g., existing APIs like `projects` or `products`).

5. **Helper Function Implementation:**
   - Ensure the `logMilestone` function is efficient, clean, and adequately tested.
   - Validate that other API files import and call the helper function correctly.

---

#### **Security: What to Audit**
1. **Database Security:**
   - Ensure that sensitive data (e.g., `user_id`) is properly secured.
   - Validate column constraints to prevent malicious or malformed inputs.

2. **Input Validation:**
   - Confirm APIs validate input for milestone logging (e.g., valid `user_id` and milestone type).
   - Prevent unauthorized users from accessing or tampering with the milestone table (e.g., ensure proper user-based scoping on `logMilestone` helper usage).

3. **Authorization and Role Checks:**
   - Confirm that milestone logging respects user roles and permissions. For example, milestones should log only for architect or contractor users and not for admin or system users, as applicable.

4. **Potential Abuse Protections:**
   - Investigate whether the APIs providing milestone logging positions could be abused to flood the database with redundant data (e.g., a "bot" creating empty projects to spam the onboarding milestones table).

5. **Log Security:**
   - Double-check any log statements to ensure no sensitive data (e.g., internal IDs or user credentials) is being written to the server logs.

---

### Summary of Responsibilities
- **Dev:** Build schema, API hooks, helper function, seed updates.
- **Test & QA:** Validate schema, test API routes for logging milestones, edge cases, performance tests.
- **Code Review:** Focus on efficiency, consistency, error handling, and maintaining best practices.
- **Security:** Audit database design, input validation, role checks, and log sanitization.

You’re clear to proceed! Let me know when the outputs are ready for review or if further instruction is needed.