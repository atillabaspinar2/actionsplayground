# GitHub Actions — workflow file summary

Place workflow files in the `.github/workflows/` folder. Files must be valid YAML and use the `.yml` or `.yaml` extension.

## 1. Basic structure

1. name — Human-friendly workflow name
2. on — Triggers (events) that start the workflow
3. jobs — One or more jobs to run
4. steps — Ordered steps inside each job

## 2. Example: minimal workflow header

```yaml
name: Example workflow
on: push
```

## 3. Common triggers

### 3.1 Push to branches

```yaml
on:
  push:
    branches:
      - main
```

### 3.2 Manual dispatch (run from Actions UI)

```yaml
on:
 workflow_dispatch: {}
```

### 3.3 Pull request events ( event activity types)

```yaml
on:
 pull_request:
  types: [opened, synchronize]
```

### 3.4 Pull request events ( event filters)

```yaml
on:
 pull_request:
  branches:
   - main
        branches_ignore:
            - 'feat/**'

```

### 3.5 Cancel a workflow by commit messages

```yaml
   [skip ci]
   [ci skip]
   [no ci]
   [skip actions]
   [actions skip]
```

## 4. Artifacts

### 4.1 Create a step in job with the action

```yaml
steps:
  - name: create dist artifact
    uses: actions/upload-artifact@v3
    with:
      name: dist-artifact
      path: dist #after npm build, use dist folder as artifact for the following steps
```

### 4.2 Use artifact in anohter job

```yaml
steps:
  - name: use dist artifact
    uses: actions/download-artifact@v3
    with:
      name: dist-artifact
```

## 5. Outputs

A step creates and output, the in outputs section, we get hold of this output and may be use in anoher step or job.
Use 'needs' to find the correct output reference.

```yaml
jobs:
  build:
    outputs:
      script-file: ${{ steps.create-script-file.outputs.scriptfile }}
    steps:
      -name: create script file
      id: create-script-file
      run: find dist/assets/*.js -type f execdir echo 'scriptfile={} >> ${GITHUB_OUTPUT}'
  deploy:
    steps:
      - name: download script file
      run: echo "${needs.build.outputs.scriptfile}"


```

## 6. Caching dependencies

Cache the downloaded packages in .npm folder so that npm install will not download them again.

```yaml
jobs:
  build:
    steps:
      - name: checkout
      uses: actions/checkout@v4
      - name: cache
      uses: actions/cache@v4
      with:
        key: cache-npm-${{hashFiles('**/package-lock.json')}}
        #whenever package-lock content changes, invalidate cache
        paths: ~/.npm
      - name: install
      run: npm ci

  deploy:
    needs: build
    steps:
      - name: checkout
      uses: actions/checkout@v4
      - name: cache
      uses: actions/cache@v4
      with:
        key: cached-npm-${{hashFiles('**/package-lock.json')}}
        #whenever package-lock content changes, invalidate cache
        paths:  ~/.npm
      - name: install
      run: npm ci
      - name: deploy
      run: echo "deploying..."

```

## 7. Environment variables

In node environment we define and use them as process.env.DB_NAME

In workflows we can set them in workflow, job or step levels

```yaml
name: First Workflow
on: workflow_dispatch
env:
  DB_NAME: mydb
  PORT: 8080
jobs:
  first_job:
    env: # or here
      DB_NAME: mydb1
    runs-on: ubuntu-22.04
    steps:
      - name: greet
        run: echo "greeting"
        env: # or here
          DB_NAME: mydb2 
      - name: bye
        run: echo "bye"

#env variables can be used in the code or in the workflow
   run_job:
    runs-on: ubuntu-22.04
    steps:
      - name: get env
        run: echo $PORT #use env variable
      - name: get env with expression
        run: echo ${{ env.PORT }} #use env variable
```

## 8. Secrets

Create secret in repo settings. Use them in workflow mostly in env values.
When we expose it with echo, github does not print the secret values but ***

```yaml
   run_job:
    runs-on: ubuntu-22.04
    env: 
      DB_NAME: ${{ secrets.DB_NAME }}
      DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
    steps:
      - name: get env with expression
        run: echo name: ${{ env.DB_NAME }} pass: ${{ env.DB_PASSWORD }} 
```

### 8.1 Using environments for secrets

If we need the save env variable to have different values for different environments,
they should be stored in environment secrets. If the value is same for all environments
we can use repository secrets.
To use environment for getting a version of the secret

```yaml
   run_job:
    runs-on: ubuntu-22.04
    environment: testing #define a testing environment in settings and create secrets in that env.
    env: 
      DB_NAME: ${{ secrets.DB_NAME }}
      DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
    steps:
      - name: get env with expression
        run: echo name: ${{ env.DB_NAME }} pass: ${{ env.DB_PASSWORD }} 
```

## 9 Controlling work flow

### 9.1 If

```yaml

   run_job:
    runs-on: ubuntu-22.04
    environment: testing #define a testing environment in settings and create secrets in that env.
    env: 
      DB_NAME: ${{ secrets.DB_NAME }}
      DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
    steps:
      - name: get env with expression
        id: get-env
        run: echo name: ${{ env.DB_NAME }} pass: ${{ env.DB_PASSWORD }} 
      - name: try
        if: failure() &&  steps.get-env.outcome == "failure"
        # you need failure() becuse if the previous step failes the execution stops without cheking the if condition
        run: echo "failed
```

### 9.2 continue_on_error

TODO

### 9.3 Matrix: run same jobs with different environments

TODO

### 9.4 Reuse worflows passing inputs and getting outputs like functions

TODO

## 10. Containers instead of runner images

### 10.1 containers

A container is optional. It can be useful to save process, like playwright container on top of ubuntu
so that the workflow does not have to install browser images.

```yaml
  name: workflow1
  jobs:
    build:
      runs-on: ubuntu-22.04
      container: node:16
      steps:
      ...

  # or
  name: workflow1
  jobs:
    build:
      runs-on: ubuntu-22.04
      container: 
      image: node:16
      env: #this is container env, not github actions env
        MONGODB_USER: ${{ secrets.MONGODB_USER }}
        MONGODB_PASSWORD: ${{ secrets.MONGODB_PASSWORD }}
```

### 10.2 Service containers

 It is attached to a job. For example we want to run a test job for backend. But backend needs a db service that is created and destroyed during the test process.

```yaml
 # WITH CONTAINER
  name: workflow1
  jobs:
    build:
      runs-on: ubuntu-22.04
      container: node:16
      env:
        MONGODB_USER: root #must match to below
        MONGODB_PASSWORD: example
        MONGODB_CLUSTER_ADDRESS: mongodb_service # in case of container service label can be used 
      services:
        mongodb_service:
          image: mongo:5.0
          env:
            MONGO_INITDB_ROOT_USERNAME: root
            MONGO_INITDB_ROOT_PASSWORD: example
      steps:
      ...

 # NO CONTAINER, direclty on runner
  name: workflow1
  jobs:
    build:
      runs-on: ubuntu-22.04
      env:
        MONGODB_USER: root #must match to below
        MONGODB_PASSWORD: example
        MONGODB_CLUSTER_ADDRESS: 127.0.0.1:27017 # in case of no container use ip and port
      services:
        mongodb_service:
          image: mongo:5.0
          ports:
            - 27017:27017 # this is needed
          env:
            MONGO_INITDB_ROOT_USERNAME: root
            MONGO_INITDB_ROOT_PASSWORD: example
      steps:
      ...
```

## 11 - Custom actions

### 11.1 - Composite actions

It has to be in action.yml file

```yaml
  name: "action name"
  description: "action description"
  runs:
    using: "composite"
    steps: #now we just copy the steps that were repeated in workflows
      - name: step1
        id: cache
        action: actions/cache@v4
        with:
          key: cache-npm-${{hashFiles('**/package-lock.json')}}
          paths: ~/.npm
      - name: install
        run: npm ci 
```

#### 11.1.2 - Compositon action input

It has to be in action.yml file

```yaml
 #inside .github/actions/chaching/action.yml
  name: "action name"
  description: "action description"
  inputs:
    caching: #name of the input
      description: 'whether caching required or not'
      default: false
      required: true
    another-action: #...

  runs:
    using: "composite"
    steps: #now we just copy the steps that were repeated in workflows
      - name: cache
        if: ${{ inputs.caching == 'true' }} # inputs.cachinh == 'true'
        id: cache
        action: actions/cache@v4
        with:
          key: cache-npm-${{hashFiles('**/package-lock.json')}}
          paths: ~/.npm
      - name: install
        if: steps.cache.output.cache_hit == 'false' || ${{ inputs.caching == 'true' }}
        run: npm ci 
```

```yaml
 #how to use it workflow
  jobs:
    build:
      runs-on: ubuntu-22.04
      steps:
        - name: load cache
          uses: ./.github/actions/chaching #must be relative to project root.
          with:
            caching: true
```

#### 11.1.3 - Compositon action output

It has to be in action.yml file

```yaml
 #inside .github/actions/chaching/action.yml
  name: "action name"
  description: "action description"
  inputs:
    caching: #name of the input
      description: 'whether caching required or not'
      default: false
      required: true
  outputs:
    use-cache:
      description: 'whether caching required or not'
      value: ${{ steps.install.outputs.cache }}. 

  runs:
    using: "composite"
    steps:
      - name: cache
        if: ${{ inputs.caching == 'true' }} #or just inputs.caching == 'true'
        id: cache
        action: actions/cache@v4
        with:
          key: cache-npm-${{hashFiles('**/package-lock.json')}}
          paths: ~/.npm

      - name: install
        run: |
          npm ci 
          echo "cache='${{ inputs.caching }}'" >> ${GITHUB_OUTPUT} #for demo, we set output to input
````

Now we need to use this output in another step

```yaml
  jobs:
    build:
      runs-on: ubuntu-22.04
      steps:
        - name: load cache
          id: load-cache
          uses:
            caching: false
        - name: Output info
          run: echo "Cache ${{ steps.load-cache.outputs.use-cache }}"
```

## 11.2 JS Actions

action.yml file and js file is needed

```yaml
name: "Deploy to S3 Action"
description: "A GitHub Action to deploy files to an S3 bucket."
runs:
  using: "node12"
  main: "index.js"
outputs:
  web_url: ${{ steps.upload.outputs.web_url }}
inputs:
  # bucket name etc.
env: 
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

```

note: run npm init next to index.js. node_modules should be commited. check .gitignore
in the root, not to ignore anything here

```js
const core = require("@actions/core");
const exec = require("@actions/exec");

// how to get input from yaml file
  const bucketName = core.getInput("bucket_name", { required: true });

  // how to generate output to workflow
  core.setOutput("web_url", bucketName);

```

## 11.3 Docker Actions

action.yml file and Dockerfile file is needed.
We also have a file for running the commands in any language that docker image supports:
pythong, java etc.
AWS provides libraries to get input, deploy etc. for those languages.
for example, for python boto3 library is used for aws s3

inputs in yaml file are passed to Docker environment with a prefix INPUT_
eg.: INPUT_BUCKET_NAME

```yaml
name: "Deploy to S3 Action with Docker Action"
description: "A GitHub Action to deploy files to an S3 bucket."
runs:
  using: "docker"
  image: Dockerfile #this lives in the same place as action.yml
inputs:
  bucket_name: ${{env.BUCKET_NAME}}
outputs:
  web_url: ${{ steps.upload.outputs.web_url }}
```
