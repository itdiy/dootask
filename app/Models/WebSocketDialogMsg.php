<?php

namespace App\Models;

use App\Exceptions\ApiException;
use App\Module\Base;
use App\Tasks\PushTask;
use App\Tasks\WebSocketDialogMsgTask;
use Carbon\Carbon;
use Hhxsv5\LaravelS\Swoole\Task\Task;

/**
 * App\Models\WebSocketDialogMsg
 *
 * @property int $id
 * @property int|null $dialog_id 对话ID
 * @property int|null $userid 发送会员ID
 * @property string|null $type 消息类型
 * @property array|mixed $msg 详细消息
 * @property int|null $read 已阅数量
 * @property int|null $send 发送数量
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read int|mixed $percentage
 * @method static \Illuminate\Database\Eloquent\Builder|WebSocketDialogMsg newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|WebSocketDialogMsg newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder|WebSocketDialogMsg query()
 * @method static \Illuminate\Database\Eloquent\Builder|WebSocketDialogMsg whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder|WebSocketDialogMsg whereDialogId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|WebSocketDialogMsg whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder|WebSocketDialogMsg whereMsg($value)
 * @method static \Illuminate\Database\Eloquent\Builder|WebSocketDialogMsg whereRead($value)
 * @method static \Illuminate\Database\Eloquent\Builder|WebSocketDialogMsg whereSend($value)
 * @method static \Illuminate\Database\Eloquent\Builder|WebSocketDialogMsg whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder|WebSocketDialogMsg whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder|WebSocketDialogMsg whereUserid($value)
 * @mixin \Eloquent
 */
class WebSocketDialogMsg extends AbstractModel
{
    protected $appends = [
        'percentage',
    ];

    protected $hidden = [
        'updated_at',
    ];

    /**
     * 阅读占比
     * @return int|mixed
     */
    public function getPercentageAttribute()
    {
        if (!isset($this->appendattrs['percentage'])) {
            if ($this->read > $this->send || empty($this->send)) {
                $this->appendattrs['percentage'] = 100;
            } else {
                $this->appendattrs['percentage'] = intval($this->read / $this->send * 100);
            }
        }
        return $this->appendattrs['percentage'];
    }

    /**
     * 消息格式化
     * @param $value
     * @return array|mixed
     */
    public function getMsgAttribute($value)
    {
        if (is_array($value)) {
            return $value;
        }
        $value = Base::json2array($value);
        if ($this->type === 'file') {
            $value['type'] = in_array($value['ext'], ['jpg', 'jpeg', 'png', 'gif']) ? 'img' : 'file';
            $value['path'] = Base::fillUrl($value['path']);
            $value['thumb'] = Base::fillUrl($value['thumb'] ?: Base::extIcon($value['ext']));
        }
        return $value;
    }

    /**
     * 标记已送达 同时 告诉发送人已送达
     * @param $userid
     * @return bool
     */
    public function readSuccess($userid)
    {
        if (empty($userid)) {
            return false;
        }
        self::transaction(function() use ($userid) {
            $msgRead = WebSocketDialogMsgRead::whereMsgId($this->id)->whereUserid($userid)->lockForUpdate()->first();
            if (empty($msgRead)) {
                $msgRead = WebSocketDialogMsgRead::createInstance([
                    'dialog_id' => $this->dialog_id,
                    'msg_id' => $this->id,
                    'userid' => $userid,
                    'after' => 1,
                ]);
                if ($msgRead->saveOrIgnore()) {
                    $this->send = WebSocketDialogMsgRead::whereMsgId($this->id)->count();
                    $this->save();
                } else {
                    return;
                }
            }
            if (!$msgRead->read_at) {
                $msgRead->read_at = Carbon::now();
                $msgRead->save();
                $this->increment('read');
                PushTask::push([
                    'userid' => $this->userid,
                    'msg' => [
                        'type' => 'dialog',
                        'mode' => 'update',
                        'data' => $this->toArray(),
                    ]
                ]);
            }
        });
        return true;
    }

    /**
     * 发送消息
     * @param int $dialog_id    会话ID（即 聊天室ID）
     * @param string $type      消息类型
     * @param array $msg        发送的消息
     * @param int $sender       发送的会员ID（默认自己，0为系统）
     * @return array
     */
    public static function sendMsg($dialog_id, $type, $msg, $sender = 0)
    {
        $dialogMsg = self::createInstance([
            'userid' => $sender ?: User::userid(),
            'type' => $type,
            'msg' => $msg,
            'read' => 0,
        ]);
        AbstractModel::transaction(function () use ($dialog_id, $msg, $dialogMsg) {
            $dialog = WebSocketDialog::find($dialog_id);
            if (empty($dialog)) {
                throw new ApiException('获取会话失败');
            }
            $dialog->last_at = Carbon::now();
            $dialog->save();
            $dialogMsg->send = 1;
            $dialogMsg->dialog_id = $dialog->id;
            $dialogMsg->save();
        });
        Task::deliver(new WebSocketDialogMsgTask($dialogMsg->id));
        return Base::retSuccess('发送成功', $dialogMsg);
    }
}
