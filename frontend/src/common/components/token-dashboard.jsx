import React, { Component } from "react";
import _ from 'lodash';
import cx from 'classnames';

import { formatNumber, formatCurrency, sumCoin } from 'common/helpers/utils';
import { transactionsService } from 'common/services/transaction';
import { stakeService } from 'common/services/stake';
import ThetaChart from 'common/components/chart';

import BigNumber from 'bignumber.js';
import { WEI } from 'common/constants';
import { hash } from 'common/helpers/transactions';
import { TxnTypeText, TxnClasses } from 'common/constants';

export default class TokenDashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      txnNum: 0,
      totalStaked: 0,
      holders: [],
      percentage: []
    };
  }
  componentDidMount() {
    if (this.props.type === 'theta') {
      this.getTransactionNumber();
      this.getTotalStaked();
    }
    if (this.props.type === 'tfuel') {
      this.getAllStakes();
    }
  }
  getAllStakes() {
    stakeService.getAllStake()
      .then(res => {
        const stakeList = _.get(res, 'data.body')
        let sum = stakeList.reduce((sum, info) => { return sumCoin(sum, info.amount) }, 0);
        let newObj = stakeList.reduce((map, obj) => {
          if (!map[obj.holder]) {
            map[obj.holder] = 0;
          }
          map[obj.holder] = sumCoin(map[obj.holder], obj.amount).toFixed()
          return map;
        }, {});
        let topStakes = Array.from(Object.keys(newObj), key => {
          return { 'holder': key, 'amount': newObj[key] }
        }).sort((a, b) => {
          return b.amount - a.amount
        }).slice(0, 8)
        let sumPercent = 0;
        let objList = topStakes.map(stake => {
          let obj = {};
          obj.holder = stake.holder;
          obj.percentage = new BigNumber(stake.amount).dividedBy(sum / 100).toFixed(2);
          sumPercent += obj.percentage - '0';
          return obj;
        }).concat({ holder: 'Rest Nodes', 'percentage': (100 - sumPercent).toFixed(2) })
        this.setState({
          totalStaked: sum,
          holders: objList.map(obj => { return obj.holder }),
          percentage: objList.map(obj => { return (obj.percentage - '0') })
        });
      })
      .catch(err => {
        console.log(err);
      });
  }
  getTransactionNumber() {
    transactionsService.getTotalTransactionNumber(24)
      .then(res => {
        const txnNum = _.get(res, 'data.body.total_num_tx');
        this.setState({ txnNum })
      })
      .catch(err => {
        console.log(err);
      });
  }
  getTotalStaked() {
    stakeService.getAllStake()
      .then(res => {
        const stakeList = _.get(res, 'data.body')
        let sum = stakeList.reduce((sum, info) => { return sumCoin(sum, info.amount) }, 0);
        this.setState({ totalStaked: sum });
      })
      .catch(err => {
        console.log(err);
      });
  }
  render() {
    const { txnNum, totalStaked, holders, percentage } = this.state;
    const { tokenInfo, type } = this.props;
    const icon = type + 'wei';
    const token = type.toUpperCase();
    return (
      <React.Fragment>
        {tokenInfo && <div className={cx("token dashboard", type)}>
          <div className="column">
            <div className={cx("currency", icon)}></div>
          </div>
          <div className="column">
            <Detail title={`${token} Price (USD)`} value={`\$${tokenInfo.price.toFixed(6)}`} />
            <Detail title={'MARKET CAP (USD)'} value={formatCurrency(tokenInfo.market_cap)} />
          </div>
          <div className="column">
            <Detail title={'24 HR VOLUME (USD)'} value={formatCurrency(tokenInfo.volume_24h)} />
            <Detail title={'CIRCULATING SUPPLY'} value={formatNumber(tokenInfo.circulating_supply)} />
          </div>
          <div className="column">
            {type === 'theta' && <Detail title={'24 HR TRANSACTIONS'} value={<TxnNumber num={txnNum} />} />}
            {type === 'theta' && <Detail title={'total STAKED (%)'} value={<StakedPercent supply={tokenInfo.circulating_supply} staked={totalStaked} />} />}
          </div>
          <div className="column">
            {type === 'theta' ?
              <div className="chart-container">
                <div className="title">THETA BLOCKCHAIN TRANSACTION HISTORY (14 DAYS)</div>
                <ThetaChart chartType={'line'} clickType={'stake'} />
              </div> :
              <div className="chart-container">
                <div className="title">THETA NODES</div>
                <ThetaChart chartType={'doughnut'} labels={holders} data={percentage} clickType={'stake'} />
              </div>}
          </div>
        </div>}
      </React.Fragment>
    );
  }
}

const Detail = ({ title, value }) => {
  return (
    <div className="detail">
      <div className="title">{title}</div>
      <div className={cx("value", { price: title.includes('Price') })}>{value}</div>
    </div>
  );
}

const TxnNumber = ({ num }) => {
  const duration = 24 * 60 * 60;
  const tps = num / duration;
  return (
    <React.Fragment>
      {`${formatNumber(num)}`}
      {/* <div className="tps">[{tps.toFixed(2)} TPS]</div> */}
    </React.Fragment>
  );
}

const StakedPercent = ({ supply, staked }) => {
  return (
    <React.Fragment>
      {`${new BigNumber(staked).dividedBy(WEI).dividedBy(supply / 100).toFixed(4)}%`}
    </React.Fragment>
  );
}