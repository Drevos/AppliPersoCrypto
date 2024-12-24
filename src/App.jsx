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
      const chartInstance = useRef(null);

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
        if (tokens.length > 0 || balance !== null && chartRef.current) {
          if (chartInstance.current) {
            chartInstance.current.destroy();
          }

          const ctx = chartRef.current.getContext('2d');
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

          if (balance) {
            labels.push('ETH');
            data.push(balance / 1000000000000000000);
          }

          tokens.forEach(token => {
            labels.push(token.tokenSymbol);
            data.push(token.value / Math.pow(10, token.tokenDecimal));
          });

          const backgroundColorsForChart = labels.map(() => {
            const color = backgroundColors[colorIndex % backgroundColors.length];
            colorIndex++;
            return color;
          });

          chartInstance.current = new Chart(ctx, {
            type: 'pie',
            data: {
              labels: labels,
              datasets: [{
                label: 'Token Balances',
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
                      const value = context.formattedValue || '';
                      return `${label}: ${value}`;
                    }
                  }
                }
              }
            }
          });
        }
      }, [tokens, balance]);

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
          <div className="chart-container">
            <canvas ref={chartRef}></canvas>
          </div>
          {(tokens.length > 0 || balance !== null) && (
            <p>Total Value: ≈ ${totalValue.toFixed(2)}</p>
          )}
        </div>
      );
    }

    export default App;
