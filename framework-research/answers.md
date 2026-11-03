# Questions & Answers

### **Why React Suits a Blog Application**
1. **Component Reusability:** Core UI elements (e.g., `<PostCard/>`, `<AuthorBio/>`, `<CommentSection/>`) can be structured cleanly as reusable components.
2. **Static Site Generation (SSG) & SEO:** When paired with Next.js React enables prerendering articles into static HTML files at build time offering instant load speeds and optimal search engine indexability.
3. **Ecosystem & Headless CMS Support:** React integrates natively with static site tools, Markdown parsers and headless CMS platforms (Contentful, Strapi, Sanity).

---

### **When NOT to Use React**
React should **not** be used for simple static only websites (such as single page brochure sites, static landing pages or simple resumes). Sending a full client side JavaScript framework for content that rarely changes introduces unnecessary network bandwidth, parsing overhead and hydration costs on low end mobile devices. Plain HTML/CSS or lightweight static site generators are far better suited.

---

### **What jQuery Struggles With:**
* **Imperative DOM Manipulation:** Developers must manually select and manipulate DOM nodes (e.g. `$('#elem').text('new value')`). In large apps keeping data and UI in sync leads to fragile "spaghetti code."
* **State Management:** Modern frameworks use a **declarative model** where the framework automatically updates the view whenever state changes. jQuery requires manual DOM syncs for every state update.

---

### **What EJS (Embedded JavaScript) Struggles With:**
* **Lack of Client Side Reactivity:** EJS renders full HTML strings on the web server and sends them to the browser. It cannot rerender individual UI components dynamically on the client side without executing full page reloads.
* **Component Architecture:** Modern frameworks bundle state, logic and UI together into modular client side components whereas EJS is strictly a server side template engine.

---