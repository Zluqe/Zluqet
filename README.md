# Zluqet
An open-source Pastebin service

Images:
![image](https://github.com/user-attachments/assets/a249ab7e-b743-445d-840b-d85ce30006a4)
![image](https://github.com/user-attachments/assets/cd39d1dc-4628-4897-981a-0a44be16e985)

# How to install
```bash
docker volume create zluqet
```
```bash
docker pull ghcr.io/zluqe/zluqet:latest
```
```bash
docker run -d -p 5000:5000 -v zluqet:/app/instance ghcr.io/zluqe/zluqet:latest
```

# How to Update
```bash
docker stop $(docker ps -q --filter ancestor=ghcr.io/zluqe/zluqet:latest)
```
```bash
docker rm $(docker ps -aq --filter ancestor=ghcr.io/zluqe/zluqet:latest)
```
```bash
docker rmi ghcr.io/zluqe/zluqet:latest
```
```bash
docker pull ghcr.io/zluqe/zluqet:latest
```
```bash
docker run -d -p 5000:5000 -v zluqet:/app/instance ghcr.io/zluqe/zluqet:latest
```

# How to install Zluqet CLI (WIP)
```bash
chmod +x install.sh
```
```bash
./install.sh
```
```bash
./install.sh
```

Usage:
```bash
zluqet --text "<text>" OR zluqet --file <file_location>
```