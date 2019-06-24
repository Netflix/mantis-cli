#!/usr/bin/env bash

# Set up mesos-master environment
sudo mkdir -p /mnt/local/mantisWorkerInstall/bin/
sudo mkdir -p /mnt/local/mantisWorkerInstall/lib/
sudo mkdir -p /var/run/mesos/
sudo mkdir -p /var/log/mesos/

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

# Setup Mesos repository
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv E56151BF

# Add the Mesos repository
echo "deb http://repos.mesosphere.com/${DISTRO} ${CODENAME} main" |
  sudo tee /etc/apt/sources.list.d/mesosphere.list
sudo apt-get -y update

# Install Mesos
sudo apt-get -y install mesos=1.0.1-2.0.94.ubuntu1604

# Add environment file
sudo mkdir -p /apps/mesos/conf
sudo cat > /apps/mesos/conf/environment <<FILE
ZOOKEEPER=zk://172.31.0.4:2181/mantis/mesos/mantisoss
FILE

# Add mesos-master binary
sudo mkdir -p /apps/mesos/bin
sudo cat > /apps/mesos/bin/mesos-master <<FILE
#!/usr/bin/env bash

exec mesos-master \
         --zk=\$ZOOKEEPER \
         --work_dir=/var/run/mesos \
         --log_dir=/var/log/mesos \
         --logging_level=INFO \
         --quorum=1
FILE

sudo chmod +x /apps/mesos/bin/mesos-master

# Add mesos-master run script
sudo cat > /lib/systemd/system/mesos-master.service <<FILE
[Unit]
Description=Mesos master

[Service]
Type=simple
Restart=always
LimitNOFILE=65535
EnvironmentFile=/apps/mesos/conf/environment
WorkingDirectory=/var/run/mesos/
ExecStart=/apps/mesos/bin/mesos-master

[Install]
WantedBy=multi-user.target
FILE

sudo systemctl enable mesos-master.service

# Start the mesos-master under supervision using systemd
sudo systemctl start mesos-master.service
