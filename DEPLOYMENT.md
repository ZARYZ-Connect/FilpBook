# 🚀 Deployment Guide: ZARYZ Deck Flipbook (`deck.zaryz.com`)

This guide provides step-by-step instructions to deploy the ZARYZ Company Profile Flipbook application on an Ubuntu server using Docker and Nginx reverse proxy.

---

## 📋 System Requirements
- Ubuntu Server with Docker & Docker Compose installed
- Nginx Web Server (Host)
- Certbot for SSL Certificate

---

## 🛠️ Step 1: Deploy Docker Container

Run the following commands on your Ubuntu server (`gaintserver`):

```bash
# 1. Navigate to your projects directory (e.g. /Zaryz_Edge)
cd /Zaryz_Edge

# 2. Clone the repository
git clone https://github.com/ZARYZ-Connect/FilpBook.git deck-flipbook
cd deck-flipbook

# 3. Build and launch the container (runs on port 8088 to avoid conflicts)
docker compose up -d --build
```

Verify that the container is running:
```bash
docker ps | grep zaryz_deck_flipbook
```

---

## 🌐 Step 2: Configure Host Nginx for `deck.zaryz.com`

Create an Nginx configuration file for the domain:

```bash
sudo nano /etc/nginx/sites-available/deck.zaryz.com
```

Paste the following configuration:

```nginx
server {
    listen 80;
    server_name deck.zaryz.com;

    location / {
        proxy_pass http://127.0.0.1:8088;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and reload Nginx:

```bash
# Enable site configuration
sudo ln -s /etc/nginx/sites-available/deck.zaryz.com /etc/nginx/sites-enabled/

# Test Nginx syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔒 Step 3: Enable SSL Certificate (HTTPS)

Issue a free SSL certificate using Certbot:

```bash
sudo certbot --nginx -d deck.zaryz.com
```

Select option `2` to automatically redirect HTTP to HTTPS.

---

## 🔄 Useful Maintenance Commands

| Operation | Command |
|---|---|
| **View Live Logs** | `docker logs -f zaryz_deck_flipbook` |
| **Restart Container** | `docker compose restart` |
| **Pull & Deploy Updates** | `git pull && docker compose up -d --build` |
