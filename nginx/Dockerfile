FROM node:20-alpine AS client-build
WORKDIR /app
COPY client/package.json client/package-lock.json* ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM nginx:1.25-alpine
RUN apk add --no-cache curl
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf    /etc/nginx/nginx.conf
COPY nginx/conf.d/       /etc/nginx/conf.d/
COPY --from=client-build /app/dist /usr/share/nginx/html
RUN nginx -t
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
