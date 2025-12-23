#  MergeMate: Prototype Pollution PoC

**MergeMate** is an interactive educational laboratory designed to demonstrate **Server-Side Prototype Pollution** vulnerabilities in Node.js applications.

It simulates a vulnerable "recursive merge" function often found in real-world libraries, visualizing how an attacker can pollute the global `Object.prototype` to manipulate application logic (e.g., escalating privileges to Admin).

![License](https://img.shields.io/badge/license-MIT-blue)
![Docker](https://img.shields.io/badge/docker-ready-green)
![Vulnerability](https://img.shields.io/badge/vulnerability-prototype%20pollution-red)

##  What You Will Learn
1.  How **Recursive Merge** functions work.
2.  Why failing to sanitize `__proto__` keys is dangerous.
3.  How modifying `Object.prototype` affects **every object** in the Node.js runtime.
4.  How to detect and fix this vulnerability.

##🚀 How to Run

### Option 1: Using Docker (Recommended)
```bash
# Build the image
docker build -t mergemate .

# Run the container
docker run -p 3000:3000 mergemate
