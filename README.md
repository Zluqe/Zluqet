# Zluqet
An open-source Pastebin service

Images:
![image](https://github.com/user-attachments/assets/a249ab7e-b743-445d-840b-d85ce30006a4)
![image](https://github.com/user-attachments/assets/cd39d1dc-4628-4897-981a-0a44be16e985)

# How to install / Update
```bash
curl -O https://raw.githubusercontent.com/Zluqe/Zluqet/refs/heads/main/docker-compose.yml
```
```bash
docker compose up -d --pull always
```

# How to install Zluqet CLI (API NOT WORKING PROPERLY)
```bash
curl -LO https://github.com/Zluqe/Zluqet/raw/refs/heads/main/client/install.sh
```
```bash
chmod +x install.sh
```
```bash
./install.sh
```

Usage:
```bash
zluqet --text "<text>" OR zluqet --file <file_location>
```
