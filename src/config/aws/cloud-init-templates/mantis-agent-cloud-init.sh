#!/usr/bin/env bash

# Set up mantis-agent environment
sudo mkdir -p /mnt/local/mantisWorkerInstall/bin/
sudo mkdir -p /mnt/local/mantisWorkerInstall/libs/
sudo mkdir -p /var/run/mesos/
sudo mkdir -p /var/log/mesos/

DISTRO=$(lsb_release -is | tr '[:upper:]' '[:lower:]')
CODENAME=$(lsb_release -cs)

# Set up Java 8
sudo apt-get update
sudo apt-get install -y --no-install-recommends software-properties-common
sudo apt-get install -y python3-software-properties debconf-utils
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
sudo apt-get -y install mesos=1.1.3-2.0.1

# Install unzip for jobs
sudo apt install -y unzip

# Add environment file
sudo mkdir -p /apps/mesos/conf
sudo cat > /apps/mesos/conf/environment <<FILE
MESOS_MASTER=zk://172.31.0.4:2181/mantis/mesos/mantisoss
MESOS_HOSTNAME=`hostname`
FILE

sudo mkdir -p /mnt/local/mantisWorkerInstall/jobs
cat > /mnt/local/mantisWorkerInstall/jobs/worker.properties <<FILE
mantis.master.api=http://172.31.0.7:8100/api/
mantis.master.apiportv2=8075
mantis.zookeeper.connectionTimeMs=1000
mantis.zookeeper.connection.retrySleepMs=100
mantis.zookeeper.connection.retryCount=3
mantis.zookeeper.connectString=172.31.0.4:2181
mantis.zookeeper.root=/mantis/master
mantis.zookeeper.leader.announcement.path=/leader
FILE

# Add Mantis Worker binary
cat > /mnt/local/mantisWorkerInstall/bin/mantis-worker.sh <<FILE
#!/usr/bin/env bash

set -x

JOB_URL=\`echo \$JOB_URL | sed 's|http://|&172.31.0.8:7101/api/v1/artifacts/|g'\`
echo "Executing script to download file at: \${JOB_URL}, storing in /tmp/mantis-jobs/\${JOB_NAME}/lib"
mkdir -p /tmp/mantis-jobs/\${JOB_NAME}/lib
mkdir -p /logs/mantisjobs/\${JOB_NAME}/\${JOB_ID}/\${WORKER_NUMBER}

EXTRA_OPTS="-Dcom.sun.management.jmxremote=true \
-Dcom.sun.management.jmxremote.ssl=false \
-Dcom.sun.management.jmxremote.authenticate=false \
-Dcom.sun.management.jmxremote.host=localhost \
-Dcom.sun.management.jmxremote.port=\$MANTIS_WORKER_DEBUG_PORT"

JAVA_OPTS="\$EXTRA_OPTS \
-Xmx\${JVM_MEMORY_MB}m \
-XX:+PrintGCDetails \
-XX:+PrintGCTimeStamps \
-XX:+HeapDumpOnOutOfMemoryError \
-XX:HeapDumpPath=/logs/mantisjobs/\${JOB_NAME}/\${JOB_ID}/\${WORKER_NUMBER} \
-Xloggc:/logs/mantisjobs/\${JOB_NAME}/\${JOB_ID}/\${WORKER_NUMBER}/gc.log \
-XX:MaxDirectMemorySize=256m"

JVM_CLASSPATH="\${WORKER_LIB_DIR}/*"
JOB_JARS_DIR="/tmp/mantis-jobs/\${JOB_NAME}/lib"
JOB_PROVIDER_CLASS=""

sudo wget -v \$JOB_URL -P "/tmp/mantis-jobs/\${JOB_NAME}/lib"

# Link worker.properties
cp -s /mnt/local/mantisWorkerInstall/jobs/* "/tmp/mantis-jobs/\${JOB_NAME}/lib"
# Link mantis-worker.jar
cp -s /mnt/local/mantisWorkerInstall/libs/* "/tmp/mantis-jobs/\${JOB_NAME}/lib"
cd \$JOB_JARS_DIR

zipexists=\`ls -l *.zip 2>/dev/null | wc -l\`

if [ \$zipexists = 1 ]
then
    mkdir zipExtract
    unzip *.zip -d zipExtract
    JOB_PROVIDER_CLASS=\`cat zipExtract/*/config/io.mantisrx.runtime.MantisJobProvider\`
    echo "job provider class \$JOB_PROVIDER_CLASS"
    ZIP_LIB_DIR=\`echo \$JOB_JARS_DIR/zipExtract/*/lib\`
    JVM_CLASSPATH="\$ZIP_LIB_DIR/*:\$JVM_CLASSPATH"
else
    JVM_CLASSPATH="\$JVM_CLASSPATH:\$JOB_JARS_DIR/*"
fi

echo "Executing Mantis Worker java \$JAVA_OPTS -cp \$JVM_CLASSPATH -DMASTER_DESCRIPTION="\${MASTER_DESCRIPTION}" -DJOB_PROVIDER_CLASS="\$JOB_PROVIDER_CLASS" io.mantisrx.server.worker.MantisWorker"

java \$JOB_PARAM_MANTIS_WORKER_JVM_OPTS \$JAVA_OPTS -cp \$JVM_CLASSPATH -DMASTER_DESCRIPTION="\${MASTER_DESCRIPTION}" -DJOB_PROVIDER_CLASS="\$JOB_PROVIDER_CLASS" io.mantisrx.server.worker.MantisWorker -p /tmp/mantis-jobs/\${JOB_NAME}/lib/worker.properties
FILE

chmod +x /mnt/local/mantisWorkerInstall/bin/mantis-worker.sh

# Add mantis agent binary
sudo mkdir -p /apps/mesos/bin
sudo cat > /apps/mesos/bin/mantis-agent <<FILE
#!/usr/bin/env bash

ulimit -n 8192

exec mesos-slave \
         --hostname=\$MESOS_HOSTNAME \
         --log_dir=/var/log/mesos \
         --port=7104 \
         --master=\$MESOS_MASTER \
         --recover=reconnect \
         --isolation=cgroups/cpu,cgroups/mem \
         --work_dir=/var/run/mesos \
         --strict=false \
         --resources="ports:[7150-7400];ephemeral_ports:[32768-57344];network:1024"
FILE

sudo chmod +x /apps/mesos/bin/mantis-agent

# Add mantis runtime jars
wget -v https://github.com/Netflix/mantis/archive/v1.2.19.tar.gz -P /tmp/mantis && sudo tar xzvf /tmp/mantis/v1.2.19.tar.gz -C /tmp/mantis && cd /tmp/mantis/mantis-1.2.19 && ./gradlew mantis-server:mantis-server-worker:fatJar --no-daemon --info
sudo mv /tmp/mantis/mantis-1.2.19/mantis-server/mantis-server-worker/build/libs/mantis-server-worker-0.1.0-dev.0.uncommitted.jar /mnt/local/mantisWorkerInstall/libs/mantis-server-worker.jar

# Add mantis-agent run script
sudo cat > /lib/systemd/system/mantis-agent.service <<FILE
[Unit]
Description=Mantis agent

[Service]
Type=simple
Restart=always
LimitNOFILE=65535
EnvironmentFile=/apps/mesos/conf/environment
WorkingDirectory=/var/run/mesos/
ExecStart=/apps/mesos/bin/mantis-agent

[Install]
WantedBy=multi-user.target
FILE

sudo systemctl enable mantis-agent.service

# Start the mantis-agent under supervision using systemd
sudo systemctl start mantis-agent.service
