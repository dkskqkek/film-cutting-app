// PWA용 필름 절단 최적화 앱
const { useState, useRef } = React;

const FilmCuttingMobileApp = () => {
  const [rollWidth, setRollWidth] = useState(1200);
  const [rollHeight, setRollHeight] = useState(50000);
  const [pageHeight, setPageHeight] = useState(2500);
  const [filmSizes, setFilmSizes] = useState([]);
  const [optimizedLayout, setOptimizedLayout] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualWidth, setManualWidth] = useState('');
  const [manualHeight, setManualHeight] = useState('');
  const [manualQuantity, setManualQuantity] = useState('1');
  const [currentPage, setCurrentPage] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pageOpacity, setPageOpacity] = useState(0);
  const [mode, setMode] = useState('efficiency');
  const [cuttingBalance, setCuttingBalance] = useState(2);
  const fileInputRef = useRef(null);

  const simulateOCR = () => {
    const sampleData = [
      { width: 450, height: 1600, quantity: 3 },
      { width: 700, height: 500, quantity: 3 },
      { width: 600, height: 3200, quantity: 2 },
      { width: 120, height: 3500, quantity: 2 },
      { width: 150, height: 2400, quantity: 5 },
      { width: 800, height: 4000, quantity: 1 }
    ];
    
    setFilmSizes(sampleData.map((item, index) => ({
      id: Date.now() + index,
      ...item,
      color: `hsl(${Math.random() * 360}, 70%, 80%)`
    })));
  };

  const addFilmSize = (width, height, quantity = 1) => {
    const newSize = {
      id: Date.now(),
      width: parseInt(width),
      height: parseInt(height),
      quantity: parseInt(quantity),
      color: `hsl(${Math.random() * 360}, 70%, 80%)`
    };
    setFilmSizes([...filmSizes, newSize]);
  };

  const handleManualAdd = () => {
    if (manualWidth && manualHeight) {
      addFilmSize(manualWidth, manualHeight, manualQuantity);
      setManualWidth('');
      setManualHeight('');
      setManualQuantity('1');
    }
  };

  const removeFilmSize = (id) => {
    setFilmSizes(filmSizes.filter(size => size.id !== id));
  };

  const clearAllSizes = () => {
    setFilmSizes([]);
    setOptimizedLayout(null);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      alert('사진을 분석 중입니다...');
      setTimeout(() => {
        simulateOCR();
        alert('노트에서 6개 사이즈를 인식했습니다!');
      }, 2000);
    }
  };

  const optimizeLayout = () => {
    if (filmSizes.length === 0) return;

    const pieces = [];
    filmSizes.forEach(size => {
      for (let i = 0; i < size.quantity; i++) {
        pieces.push({
          ...size,
          originalId: size.id,
          pieceId: `${size.id}-${i+1}`,
          placed: false
        });
      }
    });

    pieces.sort((a, b) => (b.width * b.height) - (a.width * a.height));

    const placedPieces = [];
    const occupiedAreas = [];

    const isAreaOccupied = (x, y, width, height) => {
      return occupiedAreas.some(area => 
        !(x >= area.x + area.width || 
          x + width <= area.x || 
          y >= area.y + area.height || 
          y + height <= area.y)
      );
    };

    if (mode === 'efficiency') {
      const findBestPosition = (piece) => {
        if (piece.width > rollWidth) return null;

        let bestPosition = null;
        let bestScore = Infinity;

        for (let y = 0; y <= rollHeight - piece.height; y += 5) {
          for (let x = 0; x <= rollWidth - piece.width; x += 5) {
            if (!isAreaOccupied(x, y, piece.width, piece.height)) {
              let score = y * 1000 + x;
              
              let adjacencyBonus = 0;
              if (y === 0) adjacencyBonus += 5000;
              
              occupiedAreas.forEach(area => {
                if (Math.abs(y - (area.y + area.height)) < 10 && 
                    x < area.x + area.width && x + piece.width > area.x) {
                  adjacencyBonus += 3000;
                }
                if (Math.abs(x - (area.x + area.width)) < 10 && 
                    y < area.y + area.height && y + piece.height > area.y) {
                  adjacencyBonus += 2000;
                }
              });
              
              score -= adjacencyBonus;

              if (score < bestScore) {
                bestScore = score;
                bestPosition = { x, y };
              }
            }
          }
        }
        return bestPosition;
      };

      pieces.forEach(piece => {
        const position = findBestPosition(piece);
        
        if (position && position.y + piece.height <= rollHeight) {
          const placedPiece = {
            ...piece,
            x: position.x,
            y: position.y,
            placed: true
          };
          
          placedPieces.push(placedPiece);
          occupiedAreas.push({
            x: position.x,
            y: position.y,
            width: piece.width,
            height: piece.height
          });
          
          piece.placed = true;
        }
      });

    } else {
      const cuttingWeight = cuttingBalance / 10;

      if (cuttingWeight <= 0.4) {
        const sizeGroups = {};
        pieces.forEach(piece => {
          const key = `${piece.width}x${piece.height}`;
          if (!sizeGroups[key]) {
            sizeGroups[key] = [];
          }
          sizeGroups[key].push(piece);
        });

        let currentY = 0;
        for (const group of Object.values(sizeGroups)) {
          if (group.length === 0 || currentY >= rollHeight) continue;
          
          const pieceWidth = group[0].width;
          const pieceHeight = group[0].height;
          const piecesPerRow = Math.floor(rollWidth / pieceWidth);
          
          for (let i = 0; i < group.length; i += piecesPerRow) {
            if (currentY + pieceHeight > rollHeight) break;
            
            const rowPieces = group.slice(i, i + piecesPerRow);
            
            rowPieces.forEach((piece, index) => {
              if (!piece.placed && currentY + pieceHeight <= rollHeight) {
                placedPieces.push({
                  ...piece,
                  x: index * pieceWidth,
                  y: currentY,
                  placed: true
                });
                piece.placed = true;
              }
            });
            
            currentY += pieceHeight;
          }
        }

      } else {
        pieces.forEach(piece => {
          if (piece.width > rollWidth) return;

          let bestPosition = null;
          let bestScore = Infinity;

          for (let y = 0; y <= rollHeight - piece.height; y += 5) {
            for (let x = 0; x <= rollWidth - piece.width; x += 5) {
              if (!isAreaOccupied(x, y, piece.width, piece.height)) {
                let score = y * 1000 + x;
                
                let adjacencyBonus = 0;
                if (y === 0) adjacencyBonus += 5000;
                
                occupiedAreas.forEach(area => {
                  if (Math.abs(y - (area.y + area.height)) < 5 && 
                      x < area.x + area.width && x + piece.width > area.x) {
                    adjacencyBonus += 3000;
                  }
                  if (Math.abs(x - (area.x + area.width)) < 5 && 
                      y < area.y + area.height && y + piece.height > area.y) {
                    adjacencyBonus += 2000;
                  }
                });
                
                score -= adjacencyBonus;

                if (score < bestScore) {
                  bestScore = score;
                  bestPosition = { x, y };
                }
              }
            }
          }

          if (bestPosition && bestPosition.y + piece.height <= rollHeight) {
            placedPieces.push({
              ...piece,
              x: bestPosition.x,
              y: bestPosition.y,
              placed: true
            });
            
            occupiedAreas.push({
              x: bestPosition.x,
              y: bestPosition.y,
              width: piece.width,
              height: piece.height
            });
            
            piece.placed = true;
          }
        });
      }
    }

    const totalUsedHeight = Math.max(...placedPieces.map(p => p.y + p.height), 0);
    const totalRequiredArea = pieces.reduce((sum, piece) => sum + (piece.width * piece.height), 0);
    const totalUsedArea = rollWidth * totalUsedHeight;
    const efficiency = totalUsedArea > 0 ? (totalRequiredArea / totalUsedArea * 100) : 0;
    const placedCount = placedPieces.length;
    const totalCount = pieces.length;
    const remaining = rollHeight - totalUsedHeight;

    setOptimizedLayout({
      pieces: placedPieces,
      totalUsedHeight,
      remaining,
      efficiency: efficiency.toFixed(1),
      placedCount,
      totalCount,
      rollWidth,
      rollHeight
    });

    setCurrentPage(0);
  };

  const totalPages = optimizedLayout ? Math.ceil(optimizedLayout.totalUsedHeight / pageHeight) : 0;
  const currentPageStart = currentPage * pageHeight;
  const currentPageEnd = (currentPage + 1) * pageHeight;

  const currentPagePieces = optimizedLayout ? 
    optimizedLayout.pieces.filter(piece => 
      piece.y < currentPageEnd && piece.y + piece.height > currentPageStart
    ) : [];

  // 아이콘 컴포넌트들 (Lucide React 대신 간단한 SVG)
  const CameraIcon = () => React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, 
    React.createElement('path', { d: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z' }),
    React.createElement('circle', { cx: 12, cy: 13, r: 3 })
  );

  const SettingsIcon = () => React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    React.createElement('circle', { cx: 12, cy: 12, r: 3 }),
    React.createElement('path', { d: 'M12 1v6m0 6v6' }),
    React.createElement('path', { d: 'M3 12h6m6 0h6' })
  );

  const PlusIcon = () => React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    React.createElement('line', { x1: 12, y1: 5, x2: 12, y2: 19 }),
    React.createElement('line', { x1: 5, y1: 12, x2: 19, y2: 12 })
  );

  const RotateCcwIcon = () => React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    React.createElement('polyline', { points: '1 4 1 10 7 10' }),
    React.createElement('path', { d: 'M3.51 15a9 9 0 1 0 2.13-9.36L1 10' })
  );

  const CalculatorIcon = () => React.createElement('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    React.createElement('rect', { x: 4, y: 2, width: 16, height: 20, rx: 2 }),
    React.createElement('line', { x1: 8, y1: 6, x2: 16, y2: 6 }),
    React.createElement('line', { x1: 8, y1: 10, x2: 8, y2: 10 }),
    React.createElement('line', { x1: 12, y1: 10, x2: 12, y2: 10 }),
    React.createElement('line', { x1: 16, y1: 10, x2: 16, y2: 10 })
  );

  const ChevronLeftIcon = () => React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    React.createElement('polyline', { points: '15 18 9 12 15 6' })
  );

  const ChevronRightIcon = () => React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    React.createElement('polyline', { points: '9 18 15 12 9 6' })
  );

  const ZoomInIcon = () => React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    React.createElement('circle', { cx: 11, cy: 11, r: 8 }),
    React.createElement('line', { x1: 21, y1: 21, x2: 16.65, y2: 16.65 }),
    React.createElement('line', { x1: 11, y1: 8, x2: 11, y2: 14 }),
    React.createElement('line', { x1: 8, y1: 11, x2: 14, y2: 11 })
  );

  const ZoomOutIcon = () => React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
    React.createElement('circle', { cx: 11, cy: 11, r: 8 }),
    React.createElement('line', { x1: 21, y1: 21, x2: 16.65, y2: 16.65 }),
    React.createElement('line', { x1: 8, y1: 11, x2: 14, y2: 11 })
  );

  const Edit3Icon = () => React.createElement('svg', { width: 48, height: 48, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1 },
    React.createElement('path', { d: 'M12 20h9' }),
    React.createElement('path', { d: 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' })
  );

  return React.createElement('div', { className: 'container' },
    React.createElement('div', { className: 'card' },
      React.createElement('h1', { className: 'text-xl font-bold mb-4 text-center' }, '필름 절단 최적화'),
      
      React.createElement('div', { className: 'flex items-center gap-2 mb-4' },
        React.createElement('button', {
          onClick: () => setShowSettings(!showSettings),
          className: 'btn btn-primary'
        }, 
          React.createElement(SettingsIcon),
          React.createElement('span', { className: 'hidden sm:inline' }, '롤 설정')
        ),
        React.createElement('span', { className: 'text-sm text-gray-600' }, 
          `현재 롤: ${rollWidth}×${rollHeight}mm`
        )
      ),

      showSettings && React.createElement('div', { className: 'bg-gray-50 p-3 rounded-lg mb-4' },
        React.createElement('div', { className: 'grid grid-3 gap-3' },
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-2' }, '롤 가로 (mm)'),
            React.createElement('input', {
              type: 'number',
              value: rollWidth,
              onChange: (e) => setRollWidth(parseInt(e.target.value) || 0),
              className: 'input'
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-2' }, '롤 세로 (mm)'),
            React.createElement('input', {
              type: 'number',
              value: rollHeight,
              onChange: (e) => setRollHeight(parseInt(e.target.value) || 0),
              className: 'input'
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium mb-2' }, '페이지 높이 (mm)'),
            React.createElement('input', {
              type: 'number',
              value: pageHeight,
              onChange: (e) => setPageHeight(parseInt(e.target.value) || 1000),
              className: 'input'
            })
          )
        )
      ),

      React.createElement('div', { className: 'grid grid-4 gap-2 mb-4' },
        React.createElement('button', {
          onClick: () => fileInputRef.current?.click(),
          className: 'btn btn-green'
        },
          React.createElement(CameraIcon),
          React.createElement('span', { className: 'hidden sm:inline' }, '노트 사진'),
          React.createElement('span', { className: 'sm:hidden' }, '사진')
        ),
        React.createElement('button', {
          onClick: () => setShowManualInput(!showManualInput),
          className: 'btn btn-orange'
        },
          React.createElement(PlusIcon),
          React.createElement('span', { className: 'hidden sm:inline' }, '수동 입력'),
          React.createElement('span', { className: 'sm:hidden' }, '입력')
        ),
        React.createElement('button', {
          onClick: clearAllSizes,
          className: 'btn btn-red'
        },
          React.createElement(RotateCcwIcon),
          React.createElement('span', { className: 'hidden sm:inline' }, '전체 삭제'),
          React.createElement('span', { className: 'sm:hidden' }, '삭제')
        ),
        React.createElement('button', {
          onClick: simulateOCR,
          className: 'btn btn-gray'
        },
          React.createElement('span', { className: 'hidden sm:inline' }, '샘플 데이터'),
          React.createElement('span', { className: 'sm:hidden' }, '샘플')
        )
      ),

      React.createElement('input', {
        ref: fileInputRef,
        type: 'file',
        accept: 'image/*',
        capture: 'environment',
        onChange: handleImageUpload,
        className: 'hidden'
      }),

      showManualInput && React.createElement('div', { className: 'mt-4 p-3 bg-blue-50 rounded-lg' },
        React.createElement('h3', { className: 'font-medium mb-2 text-sm' }, '사이즈 수동 입력'),
        React.createElement('div', { className: 'grid grid-4 gap-2' },
          React.createElement('input', {
            type: 'number',
            value: manualWidth,
            onChange: (e) => setManualWidth(e.target.value),
            placeholder: '가로',
            className: 'input'
          }),
          React.createElement('input', {
            type: 'number',
            value: manualHeight,
            onChange: (e) => setManualHeight(e.target.value),
            placeholder: '세로',
            className: 'input'
          }),
          React.createElement('input', {
            type: 'number',
            value: manualQuantity,
            onChange: (e) => setManualQuantity(e.target.value),
            min: '1',
            placeholder: '수량',
            className: 'input'
          }),
          React.createElement('button', {
            onClick: handleManualAdd,
            className: 'btn btn-primary'
          }, '추가')
        )
      ),

      React.createElement('div', { className: 'mt-4' },
        React.createElement('h3', { className: 'font-medium mb-2 text-sm' }, '배치 방식'),
        React.createElement('div', { className: 'space-y-2' },
          React.createElement('label', { className: 'flex items-center text-sm' },
            React.createElement('input', {
              type: 'radio',
              value: 'efficiency',
              checked: mode === 'efficiency',
              onChange: (e) => setMode(e.target.value),
              className: 'mr-2'
            }),
            '공간 효율성 우선 (테트리스식)'
          ),
          React.createElement('div', null,
            React.createElement('label', { className: 'flex items-center text-sm mb-2' },
              React.createElement('input', {
                type: 'radio',
                value: 'cutting',
                checked: mode === 'cutting',
                onChange: (e) => setMode(e.target.value),
                className: 'mr-2'
              }),
              '절단 방식 조절'
            ),
            mode === 'cutting' && React.createElement('div', { className: 'ml-5 flex items-center gap-2' },
              React.createElement('span', { className: 'text-sm text-gray-600' }, '편의성'),
              React.createElement('input', {
                type: 'range',
                min: '2',
                max: '8',
                value: cuttingBalance,
                onChange: (e) => setCuttingBalance(parseInt(e.target.value)),
                className: 'flex-1'
              }),
              React.createElement('span', { className: 'text-sm text-gray-600' }, '길이절약')
            )
          )
        )
      ),

      React.createElement('button', {
        onClick: optimizeLayout,
        disabled: filmSizes.length === 0,
        className: 'w-full mt-4 btn btn-purple'
      },
        React.createElement(CalculatorIcon),
        '최적 배치 계산'
      )
    ),

    filmSizes.length > 0 && React.createElement('div', { className: 'card' },
      React.createElement('h2', { className: 'text-lg font-medium mb-3' }, `필요한 필름 사이즈 (${filmSizes.length}개)`),
      React.createElement('div', { className: 'grid grid-2 gap-2' },
        filmSizes.map(size => 
          React.createElement('div', { 
            key: size.id, 
            className: 'flex items-center justify-between p-2 border rounded-lg bg-gray-50' 
          },
            React.createElement('div', { className: 'flex items-center gap-2' },
              React.createElement('div', {
                className: 'w-4 h-4 rounded border',
                style: { backgroundColor: size.color }
              }),
              React.createElement('div', { className: 'text-sm' },
                React.createElement('div', { className: 'font-medium' }, `${size.width} × ${size.height}mm`),
                React.createElement('div', { className: 'text-sm text-gray-600' }, `${size.quantity}개`)
              )
            ),
            React.createElement('button', {
              onClick: () => removeFilmSize(size.id),
              className: 'text-red-500 text-sm p-2'
            }, '삭제')
          )
        )
      )
    ),

    filmSizes.length === 0 && React.createElement('div', { className: 'card text-center' },
      React.createElement(Edit3Icon),
      React.createElement('p', { className: 'text-gray-500 text-sm mt-4' }, 
        '노트 사진을 촬영하거나 수동으로 필름 사이즈를 추가해보세요'
      )
    ),

    optimizedLayout && React.createElement('div', { className: 'card' },
      React.createElement('h2', { className: 'text-lg font-medium mb-3' }, '배치 결과'),
      
      React.createElement('div', { className: 'grid grid-3 gap-3 mb-4' },
        React.createElement('div', { className: 'bg-green-50 p-3 rounded-lg text-center' },
          React.createElement('p', { className: 'text-sm text-gray-600' }, '사용 길이'),
          React.createElement('p', { className: 'text-lg font-bold text-green-600' }, 
            `${(optimizedLayout.totalUsedHeight/1000).toFixed(1)}m`
          )
        ),
        React.createElement('div', { className: 'bg-gray-50 p-3 rounded-lg text-center' },
          React.createElement('p', { className: 'text-sm text-gray-600' }, '남은 길이'),
          React.createElement('p', { className: 'text-lg font-bold text-gray-600' }, 
            `${(optimizedLayout.remaining/1000).toFixed(1)}m`
          )
        ),
        React.createElement('div', { className: 'bg-blue-50 p-3 rounded-lg text-center' },
          React.createElement('p', { className: 'text-sm text-gray-600' }, '효율성'),
          React.createElement('p', { className: 'text-lg font-bold text-blue-600' }, 
            `${optimizedLayout.efficiency}%`
          )
        ),
        React.createElement('div', { className: 'bg-orange-50 p-3 rounded-lg text-center' },
          React.createElement('p', { className: 'text-sm text-gray-600' }, '배치 성공'),
          React.createElement('p', { className: 'text-lg font-bold text-orange-600' }, 
            `${optimizedLayout.placedCount}개`
          )
        ),
        React.createElement('div', { className: 'bg-purple-50 p-3 rounded-lg text-center' },
          React.createElement('p', { className: 'text-sm text-gray-600' }, '총 조각'),
          React.createElement('p', { className: 'text-lg font-bold text-purple-600' }, 
            `${optimizedLayout.totalCount}개`
          )
        ),
        React.createElement('div', { className: 'bg-indigo-50 p-3 rounded-lg text-center' },
          React.createElement('p', { className: 'text-sm text-gray-600' }, '총 페이지'),
          React.createElement('p', { className: 'text-lg font-bold' }, `${totalPages}개`)
        )
      ),

      React.createElement('div', { className: 'flex items-center justify-between mb-4 gap-2' },
        totalPages > 1 && React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement('button', {
            onClick: () => setCurrentPage(Math.max(0, currentPage - 1)),
            disabled: currentPage === 0,
            className: 'p-2 border rounded'
          }, React.createElement(ChevronLeftIcon)),
          React.createElement('span', { className: 'text-sm p-2 bg-blue-100 rounded' }, 
            `${currentPage + 1} / ${totalPages}`
          ),
          React.createElement('button', {
            onClick: () => setCurrentPage(Math.min(totalPages - 1, currentPage + 1)),
            disabled: currentPage === totalPages - 1,
            className: 'p-2 border rounded'
          }, React.createElement(ChevronRightIcon))
        ),

        React.createElement('div', { className: 'flex items-center gap-1' },
          React.createElement('button', {
            onClick: () => setZoomLevel(Math.max(0.3, zoomLevel - 0.1)),
            className: 'p-2 border rounded'
          }, React.createElement(ZoomOutIcon)),
          React.createElement('span', { className: 'text-sm p-2 bg-gray-100 rounded' }, 
            `${(zoomLevel * 100).toFixed(0)}%`
          ),
          React.createElement('button', {
            onClick: () => setZoomLevel(Math.min(2, zoomLevel + 0.1)),
            className: 'p-2 border rounded'
          }, React.createElement(ZoomInIcon))
        ),

        React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement('span', { className: 'text-sm' }, '번호'),
          React.createElement('input', {
            type: 'range',
            min: '0',
            max: '30',
            value: pageOpacity,
            onChange: (e) => setPageOpacity(parseInt(e.target.value)),
            style: { width: '60px' }
          }),
          React.createElement('span', { className: 'text-sm' }, `${pageOpacity}%`)
        )
      ),

      React.createElement('div', { 
        className: 'border bg-white mx-auto overflow-auto',
        style: { 
          height: '60vh',
          border: '2px solid #374151'
        }
      },
        React.createElement('div', {
          className: 'relative bg-white',
          style: {
            width: `${300 * zoomLevel}px`,
            height: `${(pageHeight / rollWidth) * 300 * zoomLevel}px`,
            minHeight: '200px'
          }
        },
          pageOpacity > 0 && React.createElement('div', {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              fontSize: `${Math.max(24, 36 * zoomLevel)}px`,
              color: `rgba(255, 255, 255, ${pageOpacity / 100})`,
              fontWeight: 'bold',
              textShadow: `2px 2px 4px rgba(0, 0, 0, ${pageOpacity / 100})`,
              zIndex: 10,
              pointerEvents: 'none'
            }
          }, currentPage + 1),

          currentPagePieces.map((piece) => {
            const pieceStart = piece.y;
            const pieceEnd = piece.y + piece.height;
            const visibleStart = Math.max(pieceStart, currentPageStart);
            const visibleEnd = Math.min(pieceEnd, currentPageEnd);
            const visibleHeight = visibleEnd - visibleStart;
            
            if (visibleHeight <= 0) return null;
            
            const relativeY = visibleStart - currentPageStart;
            const scale = (300 / rollWidth) * zoomLevel;
            const shouldRotate = piece.height > piece.width * 2 && zoomLevel > 0.5;
            
            return React.createElement('div', {
              key: piece.pieceId,
              className: 'absolute border flex items-center justify-center text-sm font-bold',
              style: {
                left: `${piece.x * scale}px`,
                top: `${relativeY * scale}px`,
                width: `${piece.width * scale}px`,
                height: `${visibleHeight * scale}px`,
                backgroundColor: piece.color,
                minHeight: '10px',
                minWidth: '15px',
                border: '2px solid #374151'
              },
              title: `${piece.width}×${piece.height}mm`
            },
              zoomLevel > 0.6 && React.createElement('div', {
                className: 'text-center',
                style: {
                  transform: shouldRotate ? 'rotate(-90deg)' : 'none',
                  whiteSpace: 'nowrap',
                  fontSize: `${Math.max(8, 10 * zoomLevel)}px`,
                  lineHeight: '1.2'
                }
              },
                React.createElement('div', null, `${piece.width}×${piece.height}`),
                piece.height > pageHeight && React.createElement('div', {
                  style: { color: '#ef4444', fontSize: '0.8em' }
                }, '다중')
              )
            );
          })
        )
      ),

      currentPagePieces.length > 0 && React.createElement('div', { className: 'mt-4 p-3 bg-blue-50 rounded' },
        React.createElement('h4', { className: 'font-medium mb-2 text-sm' }, `페이지 ${currentPage + 1} 포함 조각:`),
        React.createElement('div', { className: 'grid grid-3 gap-2 text-sm' },
          currentPagePieces.map((piece) =>
            React.createElement('div', { 
              key: piece.pieceId, 
              className: 'flex items-center gap-1' 
            },
              React.createElement('div', {
                style: { 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '2px',
                  backgroundColor: piece.color 
                }
              }),
              React.createElement('span', null, `${piece.width}×${piece.height}mm`)
            )
          )
        )
      ),

      React.createElement('div', { className: 'mt-4 p-3 bg-yellow-50 rounded' },
        React.createElement('h4', { className: 'font-medium mb-2 text-sm' }, '사용법 안내'),
        React.createElement('div', { className: 'text-sm text-gray-700' },
          React.createElement('p', null, '• 노트 사진: 손필기 사이즈를 촬영하여 자동 인식'),
          React.createElement('p', null, '• 배치 방식: 공간 효율성(원단절약) vs 절단편의성(작업편리)'),
          React.createElement('p', null, '• 줌: 30%~200% 조절로 세부 확인'),
          React.createElement('p', null, '• 페이지 번호: 투명도 조절로 가시성 조정')
        )
      )
    )
  );
};

// React 앱을 DOM에 렌더링
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(FilmCuttingMobileApp));