# Bugd   
Act as a Principal Android Engineer. We need to update our CI workflow file to eliminate the Node.js 20 deprecation warnings ahead of GitHub's runtime enforcement. 

Your Task:
Please open '.github/workflows/build-apk.yml' and perform the following version upgrades:

1. Locate the checkout step:
   Change 'actions/checkout@v4' to 'actions/checkout@v5' (or newer version targeting Node 24).

2. Locate the Java setup step:
   Change 'actions/setup-java@v4' to the latest available major version that supports Node 24 (or if @v4 has a specific updated patch/minor version or if @v5 is released, apply that update). 

3. Additionally, if we are using 'actions/upload-artifact@v4', ensure it is bumped if a Node 24 compatible replacement version exists.

Apply these modifications cleanly directly to the YAML stream. Provide a brief summary table of the version updates when complete.
