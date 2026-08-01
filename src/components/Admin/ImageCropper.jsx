// src/components/Admin/ImageCropper.jsx
import { useState, useRef, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { FiX, FiCheck, FiZoomIn, FiZoomOut, FiRotateCw, FiMove, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'sonner';

const ImageCropper = ({ image, onCropComplete, onClose, aspectRatio = null, cropType = null }) => {
    const [crop, setCrop] = useState(undefined);
    const [completedCrop, setCompletedCrop] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const imgRef = useRef(null);
    const [originalImage, setOriginalImage] = useState(null);
    const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        setIsLoading(true);
        const img = new Image();
        img.onload = () => {
            setOriginalImage(img);
            setIsLoading(false);
        };
        img.onerror = () => {
            toast.error("Failed to load image");
            setIsLoading(false);
        };
        img.src = image;
    }, [image]);

    const onImageLoad = (e) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        setImgDimensions({ width: naturalWidth, height: naturalHeight });
        
        const defaultCrop = {
            unit: '%',
            width: 80,
            height: 80,
            x: 10,
            y: 10,
        };
        setCrop(defaultCrop);
    };

    /**
     * Compress image to reduce size before saving to localStorage
     * @param {string} base64String - The base64 image string
     * @param {number} maxWidth - Maximum width of the image
     * @param {number} quality - JPEG quality (0-1)
     * @returns {Promise<string>} - Compressed base64 string
     */
    const compressImage = (base64String, maxWidth = 600, quality = 0.6) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Resize if too large
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    
                    // Use better image smoothing
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Compress to JPEG with quality
                    const compressed = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressed);
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => reject(new Error('Failed to load image for compression'));
            img.src = base64String;
        });
    };

    const handleCropComplete = async () => {
        if (!completedCrop || !imgRef.current) {
            toast.error("Please select a crop area first");
            return;
        }

        setIsProcessing(true);

        try {
            const canvas = document.createElement('canvas');
            const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
            const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
            
            let cropX = completedCrop.x * scaleX;
            let cropY = completedCrop.y * scaleY;
            let cropWidth = completedCrop.width * scaleX;
            let cropHeight = completedCrop.height * scaleY;
            
            canvas.width = cropWidth;
            canvas.height = cropHeight;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            ctx.drawImage(
                imgRef.current,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                0,
                0,
                cropWidth,
                cropHeight
            );
            
            let croppedImage;
            
            if (rotation !== 0) {
                const rad = rotation * Math.PI / 180;
                const rotatedCanvas = document.createElement('canvas');
                rotatedCanvas.width = cropHeight;
                rotatedCanvas.height = cropWidth;
                const rotatedCtx = rotatedCanvas.getContext('2d');
                rotatedCtx.imageSmoothingEnabled = true;
                rotatedCtx.imageSmoothingQuality = 'high';
                
                rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
                rotatedCtx.rotate(rad);
                rotatedCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
                
                croppedImage = rotatedCanvas.toDataURL('image/jpeg', 0.85);
            } else {
                croppedImage = canvas.toDataURL('image/jpeg', 0.85);
            }
            
            // COMPRESS THE IMAGE before saving to avoid localStorage quota exceeded
            toast.loading("Compressing image...", { id: "compress" });
            
            // Determine compression settings based on image type
            let maxWidth = 600;
            let quality = 0.6;
            
            // For favicon, use smaller size
            if (cropType === 'favicon' || cropWidth < 100 || cropHeight < 100) {
                maxWidth = 64;
                quality = 0.5;
            }
            // For logo, use medium size
            else if (cropType === 'logo' || cropType === 'footerLogo') {
                maxWidth = 200;
                quality = 0.7;
            }
            // For hero images and slides, use larger but still compressed
            else if (cropType === 'heroImage' || cropType === 'slide') {
                maxWidth = 800;
                quality = 0.5;
            }
            
            const compressedImage = await compressImage(croppedImage, maxWidth, quality);
            
            toast.dismiss("compress");
            
            // Pass the compressed image back
            onCropComplete(compressedImage);
            toast.success(`Image cropped and compressed successfully! (${Math.round(compressedImage.length / 1024)}KB)`);
            onClose();
            
        } catch (error) {
            console.error("Crop error:", error);
            toast.error("Failed to crop image. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.1, 3));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.1, 0.5));
    };

    const handleRotate = () => {
        setRotation(prev => (prev + 90) % 360);
        setCrop(undefined);
        setTimeout(() => {
            if (imgRef.current) {
                const defaultCrop = {
                    unit: '%',
                    width: 80,
                    height: 80,
                    x: 10,
                    y: 10,
                };
                setCrop(defaultCrop);
            }
        }, 100);
    };

    const handleReset = () => {
        setZoom(1);
        setRotation(0);
        setCrop(undefined);
        setTimeout(() => {
            if (imgRef.current) {
                const defaultCrop = {
                    unit: '%',
                    width: 80,
                    height: 80,
                    x: 10,
                    y: 10,
                };
                setCrop(defaultCrop);
            }
        }, 100);
        toast.info("Reset to original");
    };

    const handleSkipCrop = () => {
        // Still compress even when skipping crop
        toast.loading("Compressing image...", { id: "compress" });

        // Use the same type-based sizing as the crop path so skipped
        // uploads (logo/favicon/heroImage/slide) get sized correctly too.
        let maxWidth = 600;
        let quality = 0.6;

        if (cropType === 'favicon') {
            maxWidth = 64;
            quality = 0.5;
        } else if (cropType === 'logo' || cropType === 'footerLogo') {
            maxWidth = 200;
            quality = 0.7;
        } else if (cropType === 'heroImage' || cropType === 'slide') {
            maxWidth = 800;
            quality = 0.5;
        }

        compressImage(image, maxWidth, quality)
            .then(compressed => {
                toast.dismiss("compress");
                onCropComplete(compressed);
                toast.success(`Image compressed successfully! (${Math.round(compressed.length / 1024)}KB)`);
                onClose();
            })
            .catch(() => {
                toast.dismiss("compress");
                onCropComplete(image);
                toast.warning("Using original image (compression failed)");
                onClose();
            });
    };

    const getAspectRatioText = () => {
        if (!imgDimensions.width || !imgDimensions.height) return "Free cropping";
        return `${imgDimensions.width} x ${imgDimensions.height} px (Free crop)`;
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[10000]" style={{ zIndex: 99999 }}>
                <div className="bg-white rounded-lg p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading image...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[10000]" style={{ zIndex: 99999 }}>
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Crop Image</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {getAspectRatioText()} | Drag corners to select any area
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-200 rounded-full transition-all duration-200"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap justify-center gap-3 p-4 border-b bg-gray-100">
                    <button
                        onClick={handleZoomIn}
                        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 font-medium shadow-sm"
                        title="Zoom In"
                    >
                        <FiZoomIn size={18} /> <span>Zoom In</span>
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 font-medium shadow-sm"
                        title="Zoom Out"
                    >
                        <FiZoomOut size={18} /> <span>Zoom Out</span>
                    </button>
                    <button
                        onClick={handleRotate}
                        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 font-medium shadow-sm"
                        title="Rotate 90°"
                    >
                        <FiRotateCw size={18} /> <span>Rotate</span>
                    </button>
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:bg-yellow-50 hover:border-yellow-400 transition-all duration-200 font-medium shadow-sm"
                        title="Reset All"
                    >
                        <FiRefreshCw size={18} /> <span>Reset</span>
                    </button>
                </div>

                {/* Zoom Level Indicator */}
                <div className="px-5 pt-3 pb-2 text-sm text-gray-600 bg-gray-50 border-b flex justify-between items-center">
                    <div className="flex gap-4">
                        <span>🔍 Zoom: <strong>{Math.round(zoom * 100)}%</strong></span>
                        <span>🔄 Rotation: <strong>{rotation}°</strong></span>
                    </div>
                    <div className="text-xs text-gray-500">
                        💡 Tip: Click and drag inside the crop area to move it
                    </div>
                </div>

                {/* Crop Area */}
                <div className="flex-1 overflow-auto p-6 flex justify-center items-center min-h-[450px] bg-gray-100">
                    <div 
                        style={{ 
                            transform: `scale(${zoom})`, 
                            transition: 'transform 0.2s ease',
                            transformOrigin: 'center center',
                            display: 'inline-block'
                        }}
                        className="shadow-lg rounded-lg"
                    >
                        <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={undefined}
                            circularCrop={false}
                            keepSelection={true}
                            minWidth={50}
                            minHeight={50}
                            ruleOfThirds={true}
                            className="max-w-full"
                        >
                            <img
                                ref={imgRef}
                                src={image}
                                alt="Crop preview"
                                onLoad={onImageLoad}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '500px',
                                    width: 'auto',
                                    height: 'auto',
                                    objectFit: 'contain'
                                }}
                                className="cursor-crosshair rounded-lg"
                            />
                        </ReactCrop>
                    </div>
                </div>

                {/* Footer - Action Buttons */}
                <div className="bg-white border-t p-5 sticky bottom-0">
                    <div className="flex flex-col gap-3">
                        {/* Tips Section */}
                        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg mb-2">
                            <p className="flex flex-wrap gap-3">
                                <span className="font-semibold">💡 Tips:</span>
                                <span>• Drag corners to resize crop area</span>
                                <span>• Click & drag inside to move selection</span>
                                <span>• Use zoom for precise cropping</span>
                                <span>• Images are automatically compressed to save storage</span>
                            </p>
                        </div>
                        
                        {/* Buttons Section */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleSkipCrop}
                                disabled={isProcessing}
                                className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-semibold text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Skip Crop
                            </button>
                            <button
                                onClick={onClose}
                                disabled={isProcessing}
                                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-semibold text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCropComplete}
                                disabled={isProcessing}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 font-bold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <FiCheck size={20} /> Apply Crop
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;