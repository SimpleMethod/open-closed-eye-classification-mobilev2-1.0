import * as ort from 'onnxruntime-web';

// Initialize ONNX Runtime
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;

let isUsingCamera = false;
let videoStream = null;

document.querySelector('#runButton').addEventListener('click', runInference);
document.querySelector('#cameraButton').addEventListener('click', toggleCamera);

const classDescriptions = [
    "Closed Eyes 😴",
    "Open Eyes 👀"
];

function softmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sumExps = exps.reduce((acc, curr) => acc + curr, 0);
    return exps.map(x => x / sumExps);
}

async function toggleCamera() {
    const videoContainer = document.getElementById('videoContainer');
    const video = document.getElementById('video');
    const cameraButton = document.querySelector('#cameraButton');

    if (!isUsingCamera) {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                videoStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user'
                    }
                });
                video.srcObject = videoStream;
                video.onloadedmetadata = () => {
                    video.play();
                    videoContainer.style.display = 'block';
                    isUsingCamera = true;
                    cameraButton.textContent = 'Turn Off Camera';
                };
            } catch (err) {
                console.error("Error accessing camera:", err);
                alert(`Failed to access the camera: ${err.message}`);
            }
        } else {
            alert('Your browser does not support accessing the camera.');
        }
    } else {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }
        video.srcObject = null;
        videoContainer.style.display = 'none';
        isUsingCamera = false;
        cameraButton.textContent = 'Use Camera 📷';
    }
}

async function runInference() {
    const imageInput = document.getElementById('imageInput');
    const video = document.getElementById('video');
    const resultDiv = document.getElementById('result');

    let img;
    if (isUsingCamera && video.readyState === video.HAVE_ENOUGH_DATA) {
        img = video;
    } else if (imageInput.files && imageInput.files.length > 0) {
        img = await createImageBitmap(imageInput.files[0]);
    } else {
        resultDiv.textContent = 'Please select an image or enable the camera and ensure it\'s ready.';
        return;
    }

    const tensor = await preprocess(img);

    try {
        const session = await ort.InferenceSession.create('/model.onnx', { executionProviders: ['wasm'] });
        const feeds = { 'pixel_values': tensor };
        const output = await session.run(feeds);

        const outputData = Object.values(output)[0].data;
        const probabilities = softmax(Array.from(outputData));

        let resultText = "Analysis Results:\n";
        probabilities.forEach((prob, index) => {
            resultText += `${classDescriptions[index]}: ${(prob * 100).toFixed(2)}%\n`;
        });

        resultDiv.textContent = resultText;
    } catch (e) {
        console.error(e);
        resultDiv.textContent = 'Error during analysis: ' + e.message;
    }
}

async function preprocess(img) {
    const canvas = document.createElement('canvas');
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 224, 224);
    const imageData = ctx.getImageData(0, 0, 224, 224);

    const tensor = new ort.Tensor('float32', new Float32Array(224 * 224 * 3), [1, 3, 224, 224]);

    for (let i = 0; i < imageData.data.length / 4; i++) {
        for (let c = 0; c < 3; c++) {
            tensor.data[c * 224 * 224 + i] = (imageData.data[i * 4 + c] / 255.0 - 0.5) / 0.5;
        }
    }

    return tensor;
}
