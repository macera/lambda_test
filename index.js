// * 各イベントの取得可能な値は下記を参照して下さい。
// リファレンス: https://developer.github.com/v3/activity/events/types/

//※ デフォルトのAPIGateWay設定ではlambda関数はheaderを取得できないため、以下の設定をする必要があります。
// * APIGateWay設定
//   * メソッドリクエスト
//     * HTTP リクエストヘッダー: content-type, X-GitHub-Event
//   * 統合リクエスト
//     * マッピングテンプレート
//       * Content-Type: application/json
//       * テンプレート(以下)
//{
//    "method": "$context.httpMethod",
//    "body" : $input.json('$'),
//    "headers": {
//        #foreach($param in $input.params().header.keySet())
//        "$param": "$util.escapeJavaScript($input.params().header.get($param))"
//        #if($foreach.hasNext),#end
//        #end
//    }
//}

const https = require('https');
const url = require('url');
const slack_url = process.env.SLACK_WEBHOOK_URL; //環境変数はLambdaのテキストフィールドに入力
const slack_req_opts = url.parse(slack_url);
slack_req_opts.method = 'POST';
slack_req_opts.headers = {'Content-Type': 'application/json'};

exports.handler = function(event, context) {
  if (event) {

    const event_type = event.headers['X-GitHub-Event'];
    const body = event.body;
    var event_name = null;
    var event_url = null;

    switch (event_type){
      case 'push':
        if(body.forced === true){
          event_name = 'forced push';
        }else{
          event_name = event_type;
        }
        event_url = body.compare;
        break;
      case 'commit_comment':
      case 'issue_comment':
      case 'pull_request_review_comment':
        if(action === 'created'){
          event_url = body.comment.html_url;
          event_name = event_type.replace( /_/g, ' ');
        }
        break;
      case 'issues':
        if(body.action === 'opened' || body.action === 'closed'){
          event_url = body.issue.html_url;
          event_name = body.action + ' ' + event_type;
        }
        break;
      case 'pull_request':
        if(body.action === 'opened' || body.action === 'closed'){
          event_url = body.pull_request.html_url;
          event_name = body.action + ' ' + event_type.replace( /_/g, ' ');
        }
        break;
      case 'create':
      case 'delete':
        if(body.ref_type === 'tag'){
          event_url = body.repository.html_url + '/tree/' + body.ref;
          event_name = event_type + ' ' + body.ref_type;
        }else if(body.ref_type === 'branch'){
          event_url = body.repository.html_url + '/tree/' + body.ref;
          event_name = event_type + ' ' + body.ref_type;
        }
        break;
      case 'pull_request_review':
        event_url = body.review.html_url;
        event_name = body.action + ' ' + event_type.replace( /_/g, ' ');
        break;
      //必要なイベントがあればここから追加して下さい。
      // case 'deployment_status':
      //   event_url = event.repository.html_url;
      //   event_name = event_type + ' ' + deployment_status.status
      //   break;
    }

    //slack送信処理
    if(event_name){
      var req = https.request(slack_req_opts, function (res) {
        if (res.statusCode === 200) {
          context.succeed('posted to slack');
        } else {
          context.fail('status code: ' + res.statusCode);
        }
      });
  
      req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        context.fail(e.message);
      });
  
      const message = `[${event_name}] ${event_url}`;
      req.write(JSON.stringify({text: message}));
      req.end();
    }
  }
};
