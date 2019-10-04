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

# Setup Mesos repository
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv E56151BF

# Add the Mesos repository
echo "deb http://repos.mesosphere.com/${DISTRO} ${CODENAME} main" |
  sudo tee /etc/apt/sources.list.d/mesosphere.list
  sudo apt-get -y update

# Install Mesos
apt-get install -y build-essential awscli libssl-dev unattended-upgrades
sudo apt-get -y install mesos=1.0.1-2.0.94.ubuntu1604

mkdir -p /apps/mantis
wget -v https://github.com/Netflix/mantis-control-plane/archive/v1.2.9.tar.gz -P /tmp/mantis-control-plane && sudo tar xzvf /tmp/mantis-control-plane/v1.2.9.tar.gz -C /tmp/mantis-control-plane && cd /tmp/mantis-control-plane/mantis-control-plane-1.2.9 && ./gradlew assemble --no-daemon --info
sudo mv /tmp/mantis-control-plane/mantis-control-plane-1.2.9/server/build/distributions/mantis-control-plane-server-0.1.0-dev.0.uncommitted.tar /apps/mantis
tar -xf /apps/mantis/mantis-control-plane-server-0.1.0-dev.0.uncommitted.tar -C /apps/mantis
rm /apps/mantis/mantis-control-plane-server-0.1.0-dev.0.uncommitted.tar
mkdir -p /apps/mantis/mantis-control-plane-server-0.1.0-dev.0.uncommitted/src/main/webapp
mkdir -p /apps/mantis/mantis-control-plane-server-0.1.0-dev.0.uncommitted/logs
mkdir -p /apps/mantis/mantis-control-plane-server-0.1.0-dev.0.uncommitted/conf
mkdir -p /tmp/MantisSpool/namedJobs
mkdir -p /tmp/MantisArchive
sudo ln -s /apps/mantis/mantis-control-plane-server-0.1.0-dev.0.uncommitted /apps/mantis/mantis-control-plane-server

cat > /apps/mantis/mantis-control-plane-server/conf/master.properties <<FILE
mantis.master.consoleport=8100
mantis.master.apiport=8100
mantis.master.apiportv2=8100
mantis.master.schedInfoPort=8100
mantis.master.workqueuelength=100
mantis.master.storageProvider=io.mantisrx.server.master.store.SimpleCachedFileStorageProvider
mantis.master.api.status.path=api/postjobstatus
mantis.master.mesos.failover.timeout.ms=1000.0
mesos.useSlaveFiltering=false
mantis.worker.resubmissions.maximum=5
mantis.master.scheduler.iteration.interval.millis=2000
mantis.master.scheduler.disable.slave.duration.secs=60
mantis.master.ephemeral.job.unsubscribed.timeout.secs=60
mantis.master.terminated.job.to.delete.delay.hours=1
mantis.job.jvm.memory.buffer.mb=0
mantis.worker.heartbeat.interval.secs=10
mantis.worker.heartbeat.receipts.min.threshold.percent=50
mantis.worker.executor.name=Mantis Worker Executor
mantis.localmode=false
mantis.zookeeper.connectionTimeMs=1000
mantis.zookeeper.connection.retrySleepMs=100
mantis.zookeeper.connection.retryCount=3
mantis.zookeeper.connectString=172.31.0.4:2181
mantis.zookeeper.root=/mantis/master
mantis.zookeeper.leader.election.path=/hosts
mantis.zookeeper.leader.announcement.path=/leader
mesos.master.location=172.31.0.6:5050
mesos.worker.executorscript=mantis-worker.sh
mesos.worker.installDir=/mnt/local/mantisWorkerInstall
mantis.master.framework.name=MantisFramework
mesos.worker.timeoutSecondsToReportStart=10
mantis.master.metrics.port=8082
FILE

sudo cat > /apps/mantis/mantis-control-plane-server/conf/environment <<FILE
JAVA_OPTS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005 -Dmantis.zookeeper.connectString=172.31.0.4:2181 -Dmesos.master.location=172.31.0.6:5050 -Dmantis.master.exit.on.losing.leader=false"
LIBPROCESS_IP=172.31.0.7
FILE

cat > /lib/systemd/system/mantis-control-plane.service <<FILE
[Unit]
Description=Mantis Control Plane

[Service]
Type=simple
Restart=always
LimitNOFILE=65535
EnvironmentFile=/apps/mantis/mantis-control-plane-server/conf/environment
WorkingDirectory=/apps/mantis/mantis-control-plane-server
ExecStart=/bin/bash -ce "exec /apps/mantis/mantis-control-plane-server/bin/mantis-control-plane-server -p conf/master.properties 2>> /apps/mantis/mantis-control-plane-server/logs/stderr 1>> /apps/mantis/mantis-control-plane-server/logs/stdout"

[Install]
WantedBy=multi-user.target
FILE

systemctl enable mantis-control-plane.service
systemctl start mantis-control-plane.service
