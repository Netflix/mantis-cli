#!/usr/bin/env bash

# Set up Zookeeper environment
sudo mkdir -p /data/zkserverd
sudo mkdir -p /logs/zkserverd

DISTRO=$(lsb_release -is | tr '[:upper:]' '[:lower:]')

# Set up Java 8
sudo apt-get update
sudo apt-get install -y --no-install-recommends software-properties-common
sudo apt-get install -y python3-software-properties debconf-utils
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 0xB1998361219BD9C9
sudo apt-add-repository "deb http://repos.azulsystems.com/${DISTRO} stable main"
sudo apt-get update
sudo apt-get install -y zulu-8

# Download Zookeeper
sudo apt-get update
sudo apt-get install -y tar wget
wget https://archive.apache.org/dist/zookeeper/zookeeper-3.4.14/zookeeper-3.4.14.tar.gz
sudo mkdir -p /apps && sudo tar -zxf zookeeper-3.4.14.tar.gz -C /apps
sudo mv /apps/zookeeper-3.4.14 /apps/zkserverd

# Use default config
sudo cp /apps/zkserverd/conf/zoo_sample.cfg /apps/zkserverd/conf/zoo.cfg

# Add environment file
sudo cat > /apps/zkserverd/conf/environment <<FILE
ZOOCFGDIR=/apps/zkserverd/conf
ZOO_DATADIR=/data/zkserverd
ZOO_LOG_DIR=/logs/zkserverd
ZOO_LOG4J_PROP=INFO,ROLLINGFILE
FILE

# Add zk binary
sudo cat > /apps/zkserverd/bin/zkserverd <<FILE
#!/usr/bin/env bash

test -d \$ZOO_DATADIR || mkdir -p \$ZOO_DATADIR
test -d \$ZOO_LOG_DIR || mkdir -p \$ZOO_LOG_DIR

exec /apps/zkserverd/bin/zkServer.sh start
FILE

sudo chmod +x /apps/zkserverd/bin/zkserverd

# Add run script
sudo cat > /lib/systemd/system/zkserverd.service <<FILE
[Unit]
Description=Zookeeper Server

[Service]
Type=forking
Restart=always
LimitNOFILE=65535
EnvironmentFile=/apps/zkserverd/conf/environment
WorkingDirectory=/apps/zkserverd/
ExecStart=/apps/zkserverd/bin/zkserverd

[Install]
WantedBy=multi-user.target
FILE

sudo systemctl enable zkserverd.service

# Start the Zookeeper node under supervision using systemd
sudo systemctl start zkserverd.service
