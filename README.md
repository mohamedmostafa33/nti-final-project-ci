# 🚀 Reddit Clone – DevSecOps Platform on **AWS EKS | Jenkins CI | ArgoCD GitOps | Security Scanning | Observability**

An end-to-end **DevSecOps platform** that demonstrates how to build, secure, deploy, and observe a cloud-native application using **CI/CD, GitOps, Kubernetes, and AWS**.  
This project was built collaboratively and focuses on **production-style architecture and best practices**.

---

## 🧠 Project Overview

This platform automates the full lifecycle of a Reddit Clone application:

- Infrastructure provisioning using **Terraform**
- Secure **CI pipeline** with Jenkins and multiple security gates
- **GitOps-based CD** using ArgoCD
- Deployment on **AWS EKS**
- **Monitoring & observability** with Prometheus and Grafana

Git is used as the **single source of truth**, ensuring consistency, traceability, and automated recovery.

---

## 🏗️ Architecture Diagram

<img width="2260" height="1100" alt="image" src="https://github.com/user-attachments/assets/7ec1b12b-6a65-4942-8a8f-68567adf2041" />

**Flow Summary:**

1. Developer commits code to GitHub  
2. Jenkins CI pipeline is triggered  
3. Build, test, and security scans are executed  
4. Docker image is built and pushed  
5. Kubernetes manifests are updated in Git  
6. ArgoCD syncs changes to AWS EKS  
7. Application is monitored via Prometheus & Grafana  
