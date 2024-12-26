import React, { useState, useEffect, useRef } from 'react';
    import Chart from 'chart.js/auto';

    const API_KEY_ARBISCAN = 'ZEISSGIM1EU91GCPIMN97CYXM74P9TPRXQ';
    const API_KEY_COINGECKO = 'CG-zxFvPSvhvCXsZXN9SxugiLTU';

    function App() {
      const [address, setAddress] = useState('');
      const [balance, setBalance] = useState(null);
      const [ethPrice, setEthPrice] = useState(null);
      const [tokens, setTokens] = useState([]);
      const [error, setError] = useState(null);
      const chartRef = useRef(null);
      const doughnutChartRef = useRef(null);
      const chartAxisTypesRef = useRef(null);
      const chartInstance = useRef(null);
      const doughnutChartInstance = useRef(null);
      const chartAxisTypesInstance = useRef(null);
      const [historicalData, setHistoricalData] = useState(null);

      useEffect(() => {
        const fetchEthPrice = async () => {
          try {
            const url = `https://api.arbiscan.io/api?module=stats&action=ethprice&apikey=${API_KEY_ARBISCAN}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.status === '1' && data.message === 'OK') {
              setEthPrice(data.result.ethusd);
            } else {
              console.error('Failed to fetch ETH price:', data.message);
            }
          } catch (error) {
            console.error('Error fetching ETH price:', error);
          }
        };

        fetchEthPrice();
      }, []);

      useEffect(() => {
        if ((tokens.length > 0 || balance !== null) && chartRef.current) {
          if (chartInstance.current) {
            chartInstance.current.destroy();
          }

          const ctx = chartRef.current.getContext('2d');
          const labels = [];
          const datasets = [];
          const backgroundColors = [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
          ];
          let colorIndex = 0;

          const data = [];
          if (balance) {
            labels.push('ETH');
            data.push(balance / 1000000000000000000);
          }

          tokens.forEach(token => {
            labels.push(token.tokenSymbol);
            data.push(token.value / Math.pow(10, token.tokenDecimal));
          });

          datasets.push({
            label: 'Balances',
            data: data,
            backgroundColor: labels.map(() => {
              const color = backgroundColors[colorIndex % backgroundColors.length];
              colorIndex++;
              return color;
            }),
          });

          chartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: labels,
              datasets: datasets,
            },
            options: {
              indexAxis: 'y',
              responsive: true,
              scales: {
                x: {
                  stacked: true,
                },
                y: {
                  stacked: true,
                },
              },
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const label = context.label || '';
                      const value = context.parsed.x || 0;
                      const token = tokens.find(token => token.tokenSymbol === label);
                      const balanceValue = balance ? balance / 1000000000000000000 : 0;
                      if (label === 'ETH') {
                        return `${label}: ${balanceValue.toFixed(4)}`;
                      }
                      if (token) {
                        return `${label}: ${(token.value / Math.pow(10, token.tokenDecimal)).toFixed(4)}`;
                      }
                      return `${label}: ${value.toFixed(4)}`;
                    }
                  }
                }
              }
            }
          });
        }
      }, [tokens, balance]);

      useEffect(() => {
        if ((tokens.length > 0 || balance !== null) && ethPrice && doughnutChartRef.current) {
          if (doughnutChartInstance.current) {
            doughnutChartInstance.current.destroy();
          }

          const ctx = doughnutChartRef.current.getContext('2d');
          const labels = [];
          const data = [];
          const backgroundColors = [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
          ];
          let colorIndex = 0;
          let totalValue = 0;

          if (balance) {
            const ethValue = (balance / 1000000000000000000) * ethPrice;
            labels.push('ETH');
            data.push(ethValue);
            totalValue += ethValue;
          }

          tokens.forEach(token => {
            let tokenValue = (token.value / Math.pow(10, token.tokenDecimal));
            if (token.tokenSymbol === 'USDT') {
              tokenValue = tokenValue;
            } else {
              tokenValue = tokenValue * ethPrice;
            }
              labels.push(token.tokenSymbol);
              data.push(tokenValue);
              totalValue += tokenValue;
          });

          const backgroundColorsForChart = labels.map(() => {
            const color = backgroundColors[colorIndex % backgroundColors.length];
            colorIndex++;
            return color;
          });

          doughnutChartInstance.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: labels,
              datasets: [{
                label: 'Crypto Values',
                data: data,
                backgroundColor: backgroundColorsForChart,
                hoverOffset: 4
              }]
            },
            options: {
              plugins: {
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      const percentage = ((value / totalValue) * 100).toFixed(2);
                      return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                    }
                  }
                }
              }
            }
          });
        }
      }, [tokens, balance, ethPrice]);

      useEffect(() => {
        const fetchHistoricalData = async () => {
          if ((tokens.length > 0 || balance !== null) && chartAxisTypesRef.current && ethPrice) {
            if (chartAxisTypesInstance.current) {
              chartAxisTypesInstance.current.destroy();
            }

            const ctx = chartAxisTypesRef.current.getContext('2d');
            const labels = [];
            const data = [];
            const today = new Date();
            const coinIds = ['ethereum'];
            tokens.forEach(token => {
              if (token.tokenSymbol === 'USDT') {
                coinIds.push('tether');
              }
            });

            const historicalDataPromises = coinIds.map(async (coinId) => {
              const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`;
              const response = await fetch(url, {
                headers: {
                  'x_cg_demo_api_key': API_KEY_COINGECKO,
                },
              });
              if (!response.ok) {
                throw new Error(`Failed to fetch historical data for ${coinId}`);
              }
              return response.json();
            });

            try {
              const historicalDataResults = await Promise.all(historicalDataPromises);
              const historicalDataMap = {};
              coinIds.forEach((coinId, index) => {
                historicalDataMap[coinId] = historicalDataResults[index].prices;
              });
              setHistoricalData(historicalDataMap);

              for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const formattedDate = date.toLocaleDateString();
                labels.push(formattedDate);

                let totalValue = 0;
                if (balance) {
                  const ethPriceAtDate = historicalDataMap['ethereum']?.find(price => {
                    const priceDate = new Date(price[0]);
                    return priceDate.toLocaleDateString() === formattedDate;
                  })?.[1] || ethPrice;
                  totalValue += (balance / 1000000000000000000) * ethPriceAtDate;
                }
                tokens.forEach(token => {
                  let tokenValue = (token.value / Math.pow(10, token.tokenDecimal));
                  if (token.tokenSymbol === 'USDT') {
                    const usdtPriceAtDate = historicalDataMap['tether']?.find(price => {
                      const priceDate = new Date(price[0]);
                      return priceDate.toLocaleDateString() === formattedDate;
                    })?.[1] || 1;
                    tokenValue = tokenValue * usdtPriceAtDate;
                  } else {
                    const ethPriceAtDate = historicalDataMap['ethereum']?.find(price => {
                      const priceDate = new Date(price[0]);
                      return priceDate.toLocaleDateString() === formattedDate;
                    })?.[1] || ethPrice;
                    tokenValue = tokenValue * ethPriceAtDate;
                  }
                  totalValue += tokenValue;
                });
                data.push(totalValue);
              }

              chartAxisTypesInstance.current = new Chart(ctx, {
                type: 'line',
                data: {
                  labels: labels,
                  datasets: [{
                    label: 'Portfolio Value Over Time',
                    data: data,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: false,
                  }],
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Date',
                      },
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Value ($)',
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                },
              });
            } catch (error) {
              console.error('Error fetching historical data:', error);
            }
          }
        };
        fetchHistoricalData();
      }, [tokens, balance, ethPrice]);

      const fetchBalance = async () => {
        setError(null);
        if (!address) {
          setError('Please enter an address.');
          return;
        }

        try {
          const balanceUrl = `https://api.arbiscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${API_KEY_ARBISCAN}`;
          const balanceResponse = await fetch(balanceUrl);
          const balanceData = await balanceResponse.json();

          if (balanceData.status === '1' && balanceData.message === 'OK') {
            setBalance(balanceData.result);
          } else {
            setError(balanceData.message || 'Failed to fetch balance.');
            setBalance(null);
          }

          const tokenUrl = `https://api.arbiscan.io/api?module=account&action=tokentx&address=${address}&page=1&offset=100&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY_ARBISCAN}`;
          const tokenResponse = await fetch(tokenUrl);
          const tokenData = await tokenResponse.json();

          if (tokenData.status === '1' && tokenData.message === 'OK') {
             const tokenBalances = {};
             tokenData.result.forEach(token => {
                if (tokenBalances[token.tokenSymbol]) {
                  tokenBalances[token.tokenSymbol].value += parseFloat(token.value);
                } else {
                  tokenBalances[token.tokenSymbol] = {
                    tokenSymbol: token.tokenSymbol,
                    tokenDecimal: token.tokenDecimal,
                    value: parseFloat(token.value)
                  };
                }
             });
             setTokens(Object.values(tokenBalances));
          } else {
            console.error('Failed to fetch token transfers:', tokenData.message);
            setTokens([]);
          }
        } catch (err) {
          setError('An error occurred while fetching data.');
          setBalance(null);
          setTokens([]);
        }
      };

      let totalValue = 0;
      let chartData = [];
      if (balance && ethPrice) {
        chartData.push({symbol: 'ETH', value: balance / 1000000000000000000});
      }
      tokens.forEach(token => {
        chartData.push({symbol: token.tokenSymbol, value: token.value / Math.pow(10, token.tokenDecimal)});
      });

      chartData.forEach(item => {
        if (ethPrice) {
          if (item.symbol === 'ETH' || item.symbol === 'WETH') {
            totalValue += item.value * ethPrice;
          }
        }
      });

      return (
        <div className="container">
          <h1>Arbiscan Crypto Viewer</h1>
          <div>
            <input
              type="text"
              placeholder="Enter Arbiscan Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <button onClick={fetchBalance}>Fetch Balances</button>
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div style={{ display: 'flex' }}>
            <div className="chart-container" style={{ width: '50%', marginRight: '10px' }}>
              <canvas ref={chartRef}></canvas>
            </div>
            <div className="chart-container" style={{ width: '50%' }}>
              <canvas ref={doughnutChartRef}></canvas>
            </div>
          </div>
          <div className="chart-container" style={{ height: '300px', width: '100%' }}>
            <canvas ref={chartAxisTypesRef}></canvas>
          </div>
          {(tokens.length > 0 || balance !== null) && (
            <p>Total Value: ≈ ${totalValue.toFixed(2)}</p>
          )}
        </div>
      );
    }

    export default App;
