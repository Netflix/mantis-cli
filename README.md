# mantis-cli

[![Build Status](https://img.shields.io/travis/com/Netflix/mantis-cli.svg)](https://travis-ci.com/Netflix/mantis-cli)
[![OSS Lifecycle](https://img.shields.io/osslifecycle/Netflix/mantis-cli.svg)](https://github.com/Netflix/mantis-cli)
[![License](https://img.shields.io/github/license/Netflix/mantis-cli.svg)](https://www.apache.org/licenses/LICENSE-2.0)

CLI for interacting with Mantis clusters.

## Dependencies

1. node 0.10.8
2. yarn
3. oclif
4. oclif-dev

## Development

### Getting started

```sh
$ npm install -g yarn
$ npm install -g oclif
$ npm install -g @oclif/dev-cli
```

### Building

```sh
$ yarn
```

### Testing

```sh
$ yarn test
```

### Running

For local development, you can run the CLI by calling:

```sh
$ bin/run
```

Otherwise you can also link it via yarn and run the `mantis` command:

```sh
$ yarn link
$ mantis
```

## Releasing

```sh
$ oclif-dev pack
```

### MacOS installer

```sh
$ oclif-dev pack:macos
```

A `.pkg` file will be placed into `dist/`. On installation, the `mantis` binary will be
placed onto the `PATH` and its files in `/usr/local/lib`.

## Usage

### Display help

```sh
$ mantis --help
$ mantis aws:bootstrap --help
$ mantis aws:configure --help
# etc ...
```

Example output:

```sh
$ mantis aws:bootstrap --help

bootstraps a Mantis cluster in AWS

USAGE
  $ mantis aws:bootstrap

OPTIONS
  -r, --region=region  AWS region
  -y, --confirm        Autoconfirms commands

DESCRIPTION
  This command will automatically orchestrate the creation of all
  AWS and Mantis dependencies in AWS. Specifically, it will create:

     1. AWS key pair
     2. Default VPC
     3. Security groups
     4. Single Zookeeper EC2 instance backed by EBS volume
     5. Single Mesos Master EC2 instance backed by EBS volume
     6. Single Mesos Slave EC2 instance backed by EBS volume
     7. Single Mantis Control Plane EC2 instance backed by EBS volume

  This command will also set up connection strings and other properties
  for Mantis.

  Once this command finishes, you will be able to submit streaming jobs into
  your Mantis cluster via HTTP requests to the Mantis Control Plane.

  == IMPORTANT ==
  As a pre-requisite, this command requires that you set up your AWS credentials.
  See `mantis aws:configure --help` for more details.
```

### Display commands

```sh
$ mantis commands
```

### Configure AWS credentials

```sh
$ mantis aws:configure
```

### Bootstrap Mantis in AWS

```sh
$ mantis aws:bootstrap
```

### Teardown Mantis cluster in AWS

```sh
$ mantis aws:teardown
```
