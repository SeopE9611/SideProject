import { ExternalLink, Github } from 'lucide-react';
import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import * as THREE from 'three';
// OrbitControls: 카메라의 회전, 패닝, 줌 제어 (여기서는 줌/팬 비활성)
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// 포스트 프로세싱: 씬 렌더링 후 후처리 효과를 위해 사용 (여기서는 블룸 효과)
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

// 간단한 난수 생성 함수
const rand = (min, max) => Math.random() * (max - min) + min;

const SpaceScene = () => {
  const mountRef = useRef(null);

  // 현재 잠금된(호버되어 멈춘) 위성의 데이터와 화면상의 모달 위치
  const [hoverModalData, setHoverModalData] = useState(null);
  // "자세히 보기" 버튼 클릭 시 열리는 전체 모달 데이터
  const [fullModalProject, setFullModalProject] = useState(null);
  // 모달 영역에 마우스가 있는지 여부 (모달 유지 조건)
  const [isHoveringModal, setIsHoveringModal] = useState(false);
  // 현재 잠금된 위성을 저장 (paused 상태, 해당 위성은 공전 업데이트를 중단)
  const pausedSatelliteRef = useRef(null);
  // full 모달 상태를 추적하는 ref (full 모달이 열려 있으면 새로운 hover 업데이트를 무시)
  const fullModalProjectRef = useRef(null);
  // 모달 제거 타이머를 저장하는 ref
  const removalTimeoutRef = useRef(null);

  // full 모달 상태가 바뀔 때마다 ref에 업데이트 (full 모달이 열려 있으면 new hover 업데이트를 무시)
  useEffect(() => {
    fullModalProjectRef.current = fullModalProject;
  }, [fullModalProject]);

  useEffect(() => {
    // 캔버스 크기 설정
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // ====== 씬 및 배경 설정 ======
    const scene = new THREE.Scene();
    // CubeTextureLoader를 이용해 스카이박스 이미지 로드 (여기서는 6면 이미지 사용)
    const cubeLoader = new THREE.CubeTextureLoader();
    const envMap = cubeLoader.setPath('/skybox/').load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);
    scene.background = envMap;
    scene.environment = envMap;

    // ====== 카메라 설정 ======
    // PerspectiveCamera(원근 카메라): FOV 75도, 종횡비, near, far 클리핑 플레인 설정
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
    camera.position.set(0, 40, 120);

    // ====== 렌더러 설정 ======
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    // 그림자 사용 설정
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // 렌더러의 캔버스를 mountRef에 추가
    mountRef.current.appendChild(renderer.domElement);

    // ====== OrbitControls 설정 ======
    // 카메라 조작을 위한 컨트롤, 여기서는 damping만 활성화하고 줌/팬은 비활성화
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false;
    controls.enableZoom = false;
    controls.enablePan = false;

    // ====== 포스트 프로세싱 (Bloom 효과) ======
    // 효과 컴포저를 사용해 렌더링 후에 RenderPass와 BloomPass(언리얼 블룸)를 적용
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.0, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = 1.5;
    bloomPass.radius = 0.4;
    composer.addPass(bloomPass);

    // ====== 별(Starfield) 생성 ======
    // 간단한 별 필드를 생성하기 위해 수천 개의 점을 랜덤한 위치에 배치
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 2000;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // ====== 중앙 로고 (Plane) 생성 ======
    // 중앙에 로고 이미지(예: 투명 배경 PNG)를 표시하기 위한 Plane
    const textureLoader = new THREE.TextureLoader();
    const logoTexture = textureLoader.load('/logo_dark.png');
    const planeGeometry = new THREE.PlaneGeometry(120, 120);
    const planeMaterial = new THREE.MeshStandardMaterial({
      map: logoTexture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    });
    const logoPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    // 로고의 회전값은 미리 계산된 값 사용
    logoPlane.rotation.set(-0.1745, 0.1491, 0.2618);
    logoPlane.position.set(0, 0, 0);
    scene.add(logoPlane);

    // ====== 조명 설정 ======
    // AmbientLight: 전체적으로 부드러운 빛을 주기 위한 환경 조명
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    // DirectionalLight: 태양광과 유사한 강한 빛, 그림자도 생성
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // ====== 위성 및 궤도 생성 (프로젝트 데이터 포함) ======
    // 위성 데이터는 프로젝트 정보를 포함 (이름, 기간, 상세 정보)
    // const satelliteDataList = [
    //   { name: '프로젝트 1', period: '2024.01.01 ~ 2024.01.01', info: '프로젝트 1 상세 정보' },
    //   { name: '프로젝트 2', period: '2024.01.01 ~ 2024.01.01', info: '프로젝트 2 상세 정보' },
    //   { name: '프로젝트 3', period: '2024.01.01 ~ 2024.01.01', info: '프로젝트 3 상세 정보' },
    // ];

    const projects = [
      {
        title: '다시,봄',
        description_sub: '프로젝트 기간 : 2024.12.22 ~ 1.23',
        description: '친환경 제품을 판매하기 위한 목적으로 제작한 전자상거래 사이트입니다.',
        image: '/2trillionmarket_light.png',
        tags: ['Node.js', 'Vite React', 'Tailwind CSS', 'Tanstack', 'zustand'],
        liveLink: 'https://2trillionmarket.netlify.app/',
        githubLink: 'https://github.com/FRONTENDBOOTCAMP-11th/againSpring_shop/tree/main',
      },
      {
        title: '도깨비 테니스 아카데미',
        description_sub: '프로젝트 기간 : 진행중~ing',
        description: '테니스 라켓 / 스트링 교체,판매 및 아카데미 관리 목적으로 제작한 사이트입니다.',
        image: '/ddokaebi-tennis_light.png',
        tags: ['React'],
        liveLink: '#',
        githubLink: '#',
      },
      {
        title: '샬롬의집 (예정)',
        description_sub: '프로젝트 기간 : null',
        description: '서울시 강서구 방화동에 위치한 장애인 공동체 복지관 사이트 입니다.',
        image: '/shalom.png',
        tags: ['React'],
        liveLink: '#',
        githubLink: '#',
      },
    ];

    const satelliteGroups = []; // 각 위성의 그룹(궤도와 위성이 포함됨)
    const satelliteMeshes = []; // 위성 Mesh 목록
    projects.forEach((data) => {
      const group = new THREE.Group();
      scene.add(group);

      // 랜덤한 궤도 반지름, 공전 속도, 시작 각도 설정
      const radius = rand(60, 80);
      const angleSpeed = rand(0.001, 0.003);
      const angleOffset = rand(0, Math.PI * 2);

      // 궤도 선 생성: EllipseCurve로 타원(여기서는 원)을 그리고, LineLoop로 선을 그림
      const ellipseCurve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI);
      const points = ellipseCurve.getPoints(128);
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.2, transparent: true });
      const orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);
      orbitLine.rotation.x = -Math.PI / 2; // XZ 평면에 맞게 회전
      group.add(orbitLine);

      // 위성 Mesh 생성: 크기를 3으로 줄여서 작게 표시
      const satelliteGeometry = new THREE.SphereGeometry(3, 16, 16);
      const satelliteMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.5,
      });
      const satelliteMesh = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
      satelliteMesh.castShadow = true;
      // 각 위성 Mesh에 프로젝트 데이터를 저장
      satelliteMesh.userData = { projectData: data };
      group.add(satelliteMesh);

      group.userData = {
        radius,
        angle: angleOffset,
        angleSpeed,
        satelliteMesh,
      };

      satelliteGroups.push(group);
      satelliteMeshes.push(satelliteMesh);
    });

    // ====== Raycaster 및 마우스 이벤트 ======
    // 마우스 위치에 따라 3D 객체와의 교차를 검사하기 위해 사용
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      // 마우스 좌표를 -1~1 범위로 변환 (NDC 좌표계)
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    // ====== 애니메이션 루프 ======
    const animate = () => {
      requestAnimationFrame(animate);

      // 잠금되지 않은 위성(hover로 잠금되지 않은 위성)은 계속 공전 (locked된 위성은 paused)
      satelliteGroups.forEach((group) => {
        if (group.userData.satelliteMesh !== pausedSatelliteRef.current) {
          group.userData.angle += group.userData.angleSpeed;
          const r = group.userData.radius;
          const a = group.userData.angle;
          const x = r * Math.cos(a);
          const z = r * Math.sin(a);
          group.userData.satelliteMesh.position.set(x, 0, z);
          group.userData.satelliteMesh.rotation.y += 0.01;
        }
      });

      // full 모달이 열려 있지 않은 경우에만 위성 hover 업데이트 수행
      if (!fullModalProjectRef.current) {
        // raycaster를 사용하여 마우스가 위성 위에 있는지 검사
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(satelliteMeshes);
        if (intersects.length > 0) {
          const hovered = intersects[0].object;
          // 만약 현재 잠금된 위성이 다른 위성이라면,
          // 이전 위성을 해제하고 새 위성을 잠금 상태로 설정
          if (pausedSatelliteRef.current !== hovered) {
            pausedSatelliteRef.current = hovered;
            const pos = hovered.getWorldPosition(new THREE.Vector3());
            pos.project(camera);
            const screenX = ((pos.x + 1) / 2) * width;
            const screenY = ((-pos.y + 1) / 2) * height;
            // 모달 데이터 업데이트: 위성의 프로젝트 정보와 화면상의 위치
            setHoverModalData({ projectData: hovered.userData.projectData, x: screenX, y: screenY });
          }
        }
      }

      controls.update();
      composer.render();
    };
    animate();

    // 정리: 컴포넌트 언마운트 시 이벤트 리스너와 렌더러 제거
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (mountRef.current && renderer.domElement.parentNode) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []); // 씬과 애니메이션 루프는 한 번만 초기화

  return (
    <>
      {/* Three.js 캔버스가 들어갈 영역 */}
      <div ref={mountRef} style={{ width: '100%', height: '100vh', background: '#000' }} />

      {/* 위성 hover 시 표시되는 모달 (프로젝트 정보, "자세히 보기" 버튼 및 "닫기" 버튼 포함) */}
      {hoverModalData && (
        <div
          style={{
            position: 'absolute',
            top: hoverModalData.y - 60,
            left: hoverModalData.x - 50,
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '8px',
            zIndex: 200,
            pointerEvents: 'auto',
            minWidth: '200px',
          }}
        >
          {/* 제목 영역: 제목은 왼쪽, 닫기 버튼은 오른쪽 상단에 배치 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 10 }}>{`제목: ${hoverModalData.projectData.title}`}</h4>
            <p style={{ margin: '10px 0 0 0' }}>{hoverModalData.projectData.period}</p>
            <button
              onClick={() => {
                // 닫기 버튼을 누르면 hover 모달과 잠금된 위성이 해제되어 위성이 다시 공전함
                setHoverModalData(null);
                pausedSatelliteRef.current = null;
              }}
              style={{
                background: 'transparent',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              X
            </button>
          </div>

          <p style={{ margin: '5px 0 0 0' }}>{hoverModalData.projectData.description_sub}</p>
          {/* "자세히 보기" 버튼을 클릭하면 full 모달이 열림 */}
          <button onClick={() => setFullModalProject(hoverModalData.projectData)} style={{ marginTop: '5px', padding: '5px 10px' }}>
            자세히 보기
          </button>
        </div>
      )}

      {/* full 모달: "자세히 보기" 버튼 클릭 시 전체 프로젝트 상세 정보를 표시 */}
      {fullModalProject &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70 transition-opacity duration-300"
            onClick={() => {
              setFullModalProject(null);
              pausedSatelliteRef.current = null;
              setHoverModalData(null);
            }}
          >
            <div className="bg-white dark:bg-black/80 p-6 rounded shadow-lg relative max-w-4xl w-full mx-4 flex flex-col md:flex-row gap-4 text-black dark:text-white" onClick={(e) => e.stopPropagation()}>
              {/* 왼쪽: 프로젝트 이미지 */}
              <div className="md:w-1/2">
                <img src={fullModalProject.image} alt={fullModalProject.title} className="w-full h-auto object-cover rounded" />
              </div>
              {/* 오른쪽: 프로젝트 상세 정보 */}
              <div className="md:w-1/2 flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-2">{fullModalProject.title}</h3>
                  <p className="mb-2">{fullModalProject.description_sub}</p>
                  <p className="mb-4">{fullModalProject.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {fullModalProject.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <a href={fullModalProject.liveLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                    <ExternalLink size={16} /> 배포 사이트
                  </a>
                  <a href={fullModalProject.githubLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                    <Github size={16} /> GitHub
                  </a>
                </div>
              </div>
              <button
                onClick={() => {
                  setFullModalProject(null);
                  pausedSatelliteRef.current = null;
                  setHoverModalData(null);
                }}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              >
                닫기
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default SpaceScene;
