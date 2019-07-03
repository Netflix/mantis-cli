#!/usr/bin/env bash

echo "127.0.0.1 $(hostname)" | tee -a /etc/hosts

DISTRO=$(lsb_release -is | tr '[:upper:]' '[:lower:]')
CODENAME=$(lsb_release -cs)

# Set up Java 8
sudo apt-get update
sudo apt-get install -y --no-install-recommends software-properties-common
sudo apt-get install -y python-software-properties debconf-utils
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 0xB1998361219BD9C9
sudo apt-add-repository "deb http://repos.azulsystems.com/${DISTRO} stable main"
sudo apt-get update
sudo apt-get install -y zulu-8

mkdir -p /apps/mantis
wget -v https://github.com/Netflix/mantis-api/archive/v1.2.0.tar.gz -P /tmp/mantis-api && sudo tar xzvf /tmp/mantis-api/v1.2.0.tar.gz -C /tmp/mantis-api && cd /tmp/mantis-api/mantis-api-1.2.0 && ./gradlew assemble --no-daemon --info
sudo mv /tmp/mantis-api/mantis-api-1.2.0/build/distributions/mantis-api-0.1.0-dev.0.uncommitted.tar /apps/mantis
tar -xf /apps/mantis/mantis-api-0.1.0-dev.0.uncommitted.tar -C /apps/mantis
rm /apps/mantis/mantis-api-0.1.0-dev.0.uncommitted.tar
mkdir -p /apps/mantis/mantis-api-0.1.0-dev.0.uncommitted/logs
mkdir -p /apps/mantis/mantis-api-0.1.0-dev.0.uncommitted/conf
sudo ln -s /apps/mantis/mantis-api-0.1.0-dev.0.uncommitted /apps/mantis/mantis-api
sudo mkdir /logs
sudo ln -s /apps/mantis/mantis-api-0.1.0-dev.0.uncommitted/logs /logs/mantisapi

cat > /apps/mantis/mantis-api/conf/server.properties <<FILE
mantisapi.server.port=7101
mantisapi.websocket.server.port=7102
mantisapi.use.jetty=true

# Zookeeper is necessary for control plane discovery.
mantis.zookeeper.root=/mantis/master
mantis.zookeeper.connectString=172.31.0.4:2181
mantis.zookeeper.leader.announcement.path=/leader

mantisapi.vip.name=172.31.0.8:7101
mantisapi.use.mantis.tunnel=false

# Controls how long inactive websocket sessions take to timeout.
mantisapi.connection.inactive.timeout.secs=300

mantisapi.throttling.threshold.bitspersec=10000000
mantisapi.throttling.quantile=0.995
mantisapi.throttling.enabled=true

mantisapi.recorder.enabled=false
mantisapi.recorder.topic=mantisapi-flight-recorder
mantisapi.recorder.queuesize=1000

mantisapi.submit.instanceLimit=100

mantis.sse.disablePingFiltering=true
FILE

sudo cat > /apps/mantis/mantis-api/conf/environment <<FILE
FILE

cat > /lib/systemd/system/mantis-api.service <<FILE
[Unit]
Description=Mantis API

[Service]
Type=simple
Restart=always
LimitNOFILE=65535
EnvironmentFile=/apps/mantis/mantis-api/conf/environment
WorkingDirectory=/apps/mantis/mantis-api
ExecStart=/bin/bash -ce "exec /apps/mantis/mantis-api/bin/mantis-api -p conf/server.properties 2>> /apps/mantis/mantis-api/logs/stderr 1>> /apps/mantis/mantis-api/logs/stdout"

[Install]
WantedBy=multi-user.target
FILE

systemctl enable mantis-api.service
systemctl start mantis-api.service
