const path = require('path')

module.exports = {
  aws: {
    ec2: {
      apiVersion: '2016-11-15',
    },
    iam: {
      apiVersion: '2010-05-08',
    },
  },
  tag: {
    name: 'Application',
    value: 'Mantis',
  },
  keyPair: 'mantis',
  zookeeper: {
    securityGroup: 'zookeeper',
    cloudInitTemplate: path.join(__dirname, '/../../config/aws/cloud-init-templates/zookeeper-cloud-init.sh'),
  },
  mesosMaster: {
    securityGroup: 'mesos-master',
    cloudInitTemplate: path.join(__dirname, '/../../config/aws/cloud-init-templates/mesos-master-cloud-init.sh'),
  },
  mesosSlave: {
    securityGroup: 'mesos-slave',
    cloudInitTemplate: path.join(__dirname, '/../../config/aws/cloud-init-templates/mantis-agent-cloud-init.sh'),
  },
  mantisControlPlane: {
    securityGroup: 'mantis-control-plane',
    cloudInitTemplate: path.join(__dirname, '/../../config/aws/cloud-init-templates/mantis-control-plane-cloud-init.sh'),
  },
  mantisApi: {
    securityGroup: 'mantis-api',
    cloudInitTemplate: path.join(__dirname, '/../../config/aws/cloud-init-templates/mantis-api-cloud-init.sh'),
  },
}
