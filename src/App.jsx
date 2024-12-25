import React, { useState, useEffect, useRef } from 'react';
    import Chart from 'chart.js/auto';

    const API_KEY = 'ZEISSGIM1EU91GCPIMN97CYXM74P9TPRXQ';

    function App() {
      const [address, setAddress] = useState('');
      const [balance, setBalance] = useState(null);
      const [ethPrice, setEthPrice] = useState(null);
      const [tokens, setTokens] = useState([]);
      const [error, setError] = useState(null);
      const chartRef = useRef(null);
      const doughnutChartRef = useRef(null);
      const chartInstance = useRef(null);
      const doughnutChartInstance = useRef(null);

      useEffect(() => {
        const fetchEthPrice = async () => {
          try {
            const url = `https://api.arbiscan.io/api?module=stats&action=ethprice&apikey=${API_KEY}`;
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

      const fetchBalance = async () => {
        setError(null);
        if (!address) {
          setError('Please enter an address.');
          return;
        }

        try {
          const balanceUrl = `https://api.arbiscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${API_KEY}`;
          const balanceResponse = await fetch(balanceUrl);
          const balanceData = await balanceResponse.json();

          if (balanceData.status === '1' && balanceData.message === 'OK') {
            setBalance(balanceData.result);
          } else {
            setError(balanceData.message || 'Failed to fetch balance.');
            setBalance(null);
          }

          const tokenUrl = `https://api.arbiscan.io/api?module=account&action=tokentx&address=${address}&page=1&offset=100&startblock=0&endblock=99999999&sort=asc&apikey=${API_KEY}`;
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
          {(tokens.length > 0 || balance !== null) && (
            <p>Total Value: ≈ ${totalValue.toFixed(2)}</p>
          )}
        </div>
      );
    }

    export default App;
