const { execSync } = require('child_process');
const fs = require('fs');
const repository = 'blockarchivelabs/catalist-keys-api';

// 함수: Docker 이미지 생성
const buildDockerImage = () => {
    
    // package.json 파일 읽기
    const packageJson = JSON.parse(fs.readFileSync('package.json'));

    // 버전을 1 올림
    const newVersion = increaseVersion(packageJson.version);

    const curVersion = packageJson.version;
    // package.json 파일 업데이트
    packageJson.version = newVersion;
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

    // Docker 이미지 삭제
    try{
        execSync(`docker rmi $(docker images ${repository} -q) -f`, { stdio: 'inherit' });
    } catch {

    }
    
    try{    
        // Docker 이미지 빌드
        const imageName = `${repository}:${newVersion}`;
        const command = `docker build -t ${imageName} .`;
        execSync(command, { stdio: 'inherit' });
    } catch {
        packageJson.version = curVersion;
        fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    }

    return newVersion;
    
};

// 함수: Docker 이미지 삭제
const latestDockerImage = (tag) => {
    // Latest 태그를 새로운 버전으로 지정
    const imageName = `blockarchivelabs/catalist-keys-api`;
    const latestImageName = `${imageName}:latest`;
    const command = `docker tag ${imageName}:${tag} ${latestImageName}`;
    execSync(command, { stdio: 'inherit' });
};

// 함수: 버전 올리기
const increaseVersion = (version) => {
    const parts = version.split('.');
    const major = parseInt(parts[0]);
    const minor = parseInt(parts[1]);
    const patch = parseInt(parts[2]);
    return `${major}.${minor}.${patch + 1}`;
};

// Main 함수
const main = () => {
    // Docker 이미지 빌드 및 버전 올리기
    const newVersion = buildDockerImage();
    console.log(`New version: ${newVersion}`);

    // Docker 이미지 삭제 및 Latest 태그 지정
    latestDockerImage(newVersion);
    console.log(`Docker images deleted and latest tag updated.`);
};

// Main 함수 실행
main();
