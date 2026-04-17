using System;
using System.Collections.Generic;

namespace ChatApplication.Models;

public partial class Message
{
    public int MessageId { get; set; }

    public int SenderId { get; set; }

    public int? ReceiverId { get; set; }

    public int? GroupId { get; set; }

    public string? MessageText { get; set; }
    public string? MessageType { get; set; } = "Text";
    public int? CallDuration { get; set; }

    public DateTime? Timestamp { get; set; }

    public DateTime? CreatedDate { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime? UpdatedDate { get; set; }

    public string? UpdatedBy { get; set; }

    public bool? IsDeleted { get; set; }

    public bool IsSeen { get; set; }

    public virtual ICollection<ImageStore> ImageStores { get; set; } = new List<ImageStore>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual UserRegister? Receiver { get; set; }

    public virtual UserRegister User { get; set; }
}
