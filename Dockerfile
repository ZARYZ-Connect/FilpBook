# Production Dockerfile for Flipbook Application using Nginx Alpine
FROM nginx:alpine

# Copy application files to Nginx web root
COPY . /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Start Nginx web server
CMD ["nginx", "-g", "daemon off;"]
