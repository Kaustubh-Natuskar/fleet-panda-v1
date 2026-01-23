## steps to deploy on aws cloudsnail

1. **sudo** fallocate -l 1G /swapfile
   **sudo**chmod**600** /swapfile
   **sudo**mkswap /swapfile
   **sudo**swapon /swapfile
   **echo**'/swapfile none swap sw 0 0'**|**sudo**tee** -a /etc/fstab
2. sudo apt update
3. sudo apt install docker.io -y
4. docker --version
5. sudo systemctl enable docker
   sudo systemctl start docker
6. sudo usermod -aG docker ubuntu
7. logout
8. docker ps
9. sudo apt install docker-compose -y
10. docker-compose --version
11. git clone https://github.com/Kaustubh-Natuskar/fleet-panda-v1.git
12. cd fleet-panda-v1
13. docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
14. docker-compose exec app npx prisma db push
15. docker-compose exec app npx prisma db seed
